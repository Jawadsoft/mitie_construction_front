import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectStage } from './entities/project-stage.entity';
import { StageBudget } from './entities/stage-budget.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { SellDuringConstructionDto } from './dto/sell-during-construction.dto';
import { assertProjectTaxonomy, deriveAssetClass, normalizeTaxonomyInput } from './project-taxonomy';
import {
  DEVELOPMENT_STAGE_TEMPLATE,
  PROJECT_STATUSES,
  STAGE_LOCKED_STATUSES,
} from './construction-stages';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @InjectRepository(ProjectStage)
    private readonly stagesRepo: Repository<ProjectStage>,
    @InjectRepository(StageBudget)
    private readonly stageBudgetsRepo: Repository<StageBudget>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private validateTaxonomy(dto: Partial<CreateProjectDto>, requireAll: boolean) {
    try {
      const normalized = normalizeTaxonomyInput(dto);
      return assertProjectTaxonomy({
        project_type: normalized.project_type,
        project_subtype: normalized.project_subtype,
        project_strategy: normalized.project_strategy,
        requireAll,
      });
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Invalid project taxonomy');
    }
  }

  private assertValidStatus(status: string | undefined) {
    if (status === undefined) return;
    if (!(PROJECT_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException(
        `status must be one of: ${PROJECT_STATUSES.join(', ')}`,
      );
    }
  }

  private assertCanManageStages(project: Project | { project_strategy?: string | null; status?: string }) {
    if (project.project_strategy === 'DIRECT_SALE') {
      throw new BadRequestException(
        'DIRECT_SALE projects do not use construction stages',
      );
    }
  }

  private assertStagesEditable(project: Project | { status?: string; project_strategy?: string | null }) {
    this.assertCanManageStages(project);
    if (project.status && STAGE_LOCKED_STATUSES.has(project.status)) {
      throw new BadRequestException(
        `Stages cannot be edited when project status is "${project.status}"`,
      );
    }
  }

  private async seedDevelopmentStages(projectId: string) {
    for (let i = 0; i < DEVELOPMENT_STAGE_TEMPLATE.length; i++) {
      const tpl = DEVELOPMENT_STAGE_TEMPLATE[i];
      const stage = await this.stagesRepo.save(
        this.stagesRepo.create({
          project_id: projectId,
          name: tpl.name,
          description: tpl.description,
          sequence_order: i + 1,
          completion_percent: '0',
          status: 'Planned',
        }),
      );
      await this.stageBudgetsRepo.save(
        this.stageBudgetsRepo.create({
          project_stage_id: stage.id,
          labour_budget: '0',
          material_budget: '0',
          equipment_budget: '0',
          other_budget: '0',
          total_budget: '0',
        }),
      );
    }
  }

  private async loadStageActualCosts(projectId: string): Promise<Map<string, number>> {
    const rows: Array<{ project_stage_id: string; actual_cost: string }> =
      await this.dataSource.query(
        `
        SELECT e.project_stage_id::text AS project_stage_id,
          COALESCE(SUM(CAST(e.amount AS NUMERIC)), 0) AS actual_cost
        FROM expenses e
        WHERE e.project_id = $1 AND e.project_stage_id IS NOT NULL
        GROUP BY e.project_stage_id
        `,
        [projectId],
      );
    return new Map(rows.map((r) => [String(r.project_stage_id), Number(r.actual_cost)]));
  }

  private attachActualCosts(
    stages: ProjectStage[] | undefined,
    actuals: Map<string, number>,
  ) {
    if (!stages) return stages;
    return stages.map((s) => ({
      ...s,
      actual_cost: actuals.get(String(s.id)) ?? 0,
    }));
  }

  async findAll() {
    const projects = await this.projectsRepo.find({
      relations: ['stages', 'stages.budget'],
      order: { created_at: 'DESC' },
    });
    const financials = await this.loadProjectFinancials();
    const enriched: ReturnType<ProjectsService['enrichProject']>[] = [];
    for (const p of projects) {
      const actuals = await this.loadStageActualCosts(String(p.id));
      enriched.push(
        this.enrichProject(
          { ...p, stages: this.attachActualCosts(p.stages, actuals) as any },
          financials.get(String(p.id)),
        ),
      );
    }
    return enriched;
  }

  async findOne(id: string) {
    const project = await this.projectsRepo.findOne({
      where: { id },
      relations: ['stages', 'stages.budget', 'stages.progressLogs'],
    });
    if (!project) throw new NotFoundException('Project not found');
    const financials = await this.loadProjectFinancials(id);
    const actuals = await this.loadStageActualCosts(id);
    return this.enrichProject(
      { ...project, stages: this.attachActualCosts(project.stages, actuals) as any },
      financials.get(String(id)),
    );
  }

  /**
   * Aggregated project activity timeline from domain tables
   * (expenses, sales, cash, journals, labour, procurement, stages).
   */
  async getActivityLog(projectId: string) {
    const project = await this.projectsRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    type ActivityRow = {
      occurred_at: string;
      category: string;
      action: string;
      description: string;
      amount: number | null;
      reference: string | null;
      entity_type: string;
      entity_id: string | null;
    };

    const mapRows = (
      rows: Array<Record<string, unknown>>,
      map: (r: Record<string, unknown>) => ActivityRow,
    ): ActivityRow[] => rows.map(map);

    const [
      expenses,
      cash,
      journals,
      sales,
      collections,
      labourPayments,
      labourAdvances,
      stages,
      materialIssues,
      purchaseOrders,
      materialRequests,
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT id::text AS id, TO_CHAR(expense_date::date, 'YYYY-MM-DD') AS occurred_at,
                category, description, CAST(amount AS NUMERIC) AS amount, payment_type
         FROM expenses WHERE project_id = $1 ORDER BY expense_date DESC, id DESC`,
        [projectId],
      ),
      this.dataSource.query(
        `SELECT id::text AS id, TO_CHAR(transaction_date::date, 'YYYY-MM-DD') AS occurred_at,
                type, description, CAST(amount AS NUMERIC) AS amount, reference_no, method
         FROM cash_transactions WHERE project_id = $1 ORDER BY transaction_date DESC, id DESC`,
        [projectId],
      ),
      this.dataSource.query(
        `SELECT id::text AS id, TO_CHAR(entry_date::date, 'YYYY-MM-DD') AS occurred_at,
                reference_no, description, status
         FROM journal_entries WHERE project_id = $1 AND status = 'Posted'
         ORDER BY entry_date DESC, id DESC`,
        [projectId],
      ),
      this.dataSource.query(
        `SELECT s.id::text AS id, TO_CHAR(s.sale_date::date, 'YYYY-MM-DD') AS occurred_at,
                CAST(s.total_sale_price AS NUMERIC) AS amount, s.status,
                COALESCE(c.name, 'Customer') AS customer_name,
                COALESCE(pu.unit_number, pu.id::text) AS unit_label
         FROM sales s
         JOIN property_units pu ON pu.id = s.property_unit_id
         LEFT JOIN customers c ON c.id = s.customer_id
         WHERE pu.project_id = $1 AND s.status != 'Cancelled'
         ORDER BY s.sale_date DESC, s.id DESC`,
        [projectId],
      ),
      this.dataSource.query(
        `SELECT i.id::text AS id, TO_CHAR(i.paid_date::date, 'YYYY-MM-DD') AS occurred_at,
                CAST(i.paid_amount AS NUMERIC) AS amount, i.status,
                s.id::text AS sale_id, COALESCE(c.name, 'Customer') AS customer_name
         FROM sale_installments i
         JOIN sales s ON s.id = i.sale_id
         JOIN property_units pu ON pu.id = s.property_unit_id
         LEFT JOIN customers c ON c.id = s.customer_id
         WHERE pu.project_id = $1 AND i.paid_date IS NOT NULL AND CAST(i.paid_amount AS NUMERIC) > 0
         ORDER BY i.paid_date DESC, i.id DESC`,
        [projectId],
      ),
      this.dataSource.query(
        `SELECT id::text AS id, TO_CHAR(payment_date::date, 'YYYY-MM-DD') AS occurred_at,
                CAST(amount AS NUMERIC) AS amount, notes
         FROM labour_payments WHERE project_id = $1 ORDER BY payment_date DESC, id DESC`,
        [projectId],
      ),
      this.dataSource.query(
        `SELECT id::text AS id, TO_CHAR(advance_date::date, 'YYYY-MM-DD') AS occurred_at,
                CAST(amount AS NUMERIC) AS amount, notes
         FROM labour_advances WHERE project_id = $1 ORDER BY advance_date DESC, id DESC`,
        [projectId],
      ),
      this.dataSource.query(
        `SELECT id::text AS id,
                TO_CHAR(COALESCE(start_date, created_at::date)::date, 'YYYY-MM-DD') AS occurred_at,
                name, status, CAST(completion_percent AS NUMERIC) AS completion_percent,
                TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at
         FROM project_stages WHERE project_id = $1 ORDER BY sequence_order ASC, id ASC`,
        [projectId],
      ),
      this.dataSource.query(
        `SELECT id::text AS id, TO_CHAR(issue_date::date, 'YYYY-MM-DD') AS occurred_at,
                notes, purpose, CAST(total_cost AS NUMERIC) AS amount, reference_no
         FROM material_issues WHERE project_id = $1 ORDER BY issue_date DESC, id DESC`,
        [projectId],
      ),
      this.dataSource.query(
        `SELECT id::text AS id, TO_CHAR(order_date::date, 'YYYY-MM-DD') AS occurred_at,
                CAST(total_amount AS NUMERIC) AS amount, status
         FROM purchase_orders WHERE project_id = $1 ORDER BY order_date DESC, id DESC`,
        [projectId],
      ),
      this.dataSource.query(
        `SELECT id::text AS id, TO_CHAR(request_date::date, 'YYYY-MM-DD') AS occurred_at,
                status, request_no
         FROM material_requests WHERE project_id = $1 ORDER BY request_date DESC, id DESC`,
        [projectId],
      ),
    ]);

    const activities: ActivityRow[] = [
      ...mapRows(expenses, (r) => ({
        occurred_at: String(r.occurred_at),
        category: 'Expense',
        action: 'Recorded',
        description: `${r.category}${r.description ? ` — ${r.description}` : ''}`,
        amount: Number(r.amount),
        reference: r.payment_type ? String(r.payment_type) : null,
        entity_type: 'expense',
        entity_id: String(r.id),
      })),
      ...mapRows(cash, (r) => ({
        occurred_at: String(r.occurred_at),
        category: 'Cash',
        action: r.type === 'IN' ? 'Cash In' : 'Cash Out',
        description: String(r.description || r.method || 'Cash transaction'),
        amount: Number(r.amount),
        reference: r.reference_no ? String(r.reference_no) : null,
        entity_type: 'cash_transaction',
        entity_id: String(r.id),
      })),
      ...mapRows(journals, (r) => ({
        occurred_at: String(r.occurred_at),
        category: 'Accounting',
        action: 'Journal Posted',
        description: String(r.description || 'Journal entry'),
        amount: null,
        reference: r.reference_no ? String(r.reference_no) : `JE-${r.id}`,
        entity_type: 'journal_entry',
        entity_id: String(r.id),
      })),
      ...mapRows(sales, (r) => ({
        occurred_at: String(r.occurred_at),
        category: 'Sale',
        action: 'Sale Created',
        description: `${r.customer_name} · Unit ${r.unit_label} (${r.status})`,
        amount: Number(r.amount),
        reference: `SALE-${r.id}`,
        entity_type: 'sale',
        entity_id: String(r.id),
      })),
      ...mapRows(collections, (r) => ({
        occurred_at: String(r.occurred_at),
        category: 'Collection',
        action: 'Payment Received',
        description: `${r.customer_name} · Installment payment`,
        amount: Number(r.amount),
        reference: `PMT-${r.sale_id}`,
        entity_type: 'sale_installment',
        entity_id: String(r.id),
      })),
      ...mapRows(labourPayments, (r) => ({
        occurred_at: String(r.occurred_at),
        category: 'Labour',
        action: 'Wage Paid',
        description: String(r.notes || 'Labour payment'),
        amount: Number(r.amount),
        reference: `LAB-${r.id}`,
        entity_type: 'labour_payment',
        entity_id: String(r.id),
      })),
      ...mapRows(labourAdvances, (r) => ({
        occurred_at: String(r.occurred_at),
        category: 'Labour',
        action: 'Advance Paid',
        description: String(r.notes || 'Labour advance'),
        amount: Number(r.amount),
        reference: `ADV-${r.id}`,
        entity_type: 'labour_advance',
        entity_id: String(r.id),
      })),
      ...mapRows(stages, (r) => ({
        occurred_at: String(r.occurred_at),
        category: 'Stage',
        action: 'Stage',
        description: `${r.name} — ${r.status} (${Number(r.completion_percent)}% complete)`,
        amount: null,
        reference: null,
        entity_type: 'project_stage',
        entity_id: String(r.id),
      })),
      ...mapRows(materialIssues, (r) => ({
        occurred_at: String(r.occurred_at),
        category: 'Inventory',
        action: 'Material Issued',
        description: String(r.purpose || r.notes || 'Material issued to site'),
        amount: r.amount != null ? Number(r.amount) : null,
        reference: r.reference_no ? String(r.reference_no) : `ISS-${r.id}`,
        entity_type: 'material_issue',
        entity_id: String(r.id),
      })),
      ...mapRows(purchaseOrders, (r) => ({
        occurred_at: String(r.occurred_at),
        category: 'Procurement',
        action: 'Purchase Order',
        description: `PO #${r.id} — ${r.status}`,
        amount: r.amount != null ? Number(r.amount) : null,
        reference: `PO-${r.id}`,
        entity_type: 'purchase_order',
        entity_id: String(r.id),
      })),
      ...mapRows(materialRequests, (r) => ({
        occurred_at: String(r.occurred_at),
        category: 'Procurement',
        action: 'Material Request',
        description: `Request ${r.request_no || r.id} — ${r.status}`,
        amount: null,
        reference: r.request_no ? String(r.request_no) : `MR-${r.id}`,
        entity_type: 'material_request',
        entity_id: String(r.id),
      })),
    ];

    if (project.created_at) {
      const created =
        project.created_at instanceof Date
          ? project.created_at.toISOString().slice(0, 10)
          : String(project.created_at).slice(0, 10);
      activities.push({
        occurred_at: created,
        category: 'Project',
        action: 'Created',
        description: `Project created — status ${project.status}`,
        amount: null,
        reference: null,
        entity_type: 'project',
        entity_id: String(project.id),
      });
    }

    if (project.sold_as_is) {
      activities.push({
        occurred_at: project.sold_at || String(project.updated_at || '').slice(0, 10) || '',
        category: 'Project',
        action: 'Sold During Construction',
        description: `Sold as-is to ${project.sold_buyer_name || 'buyer'}${
          project.sold_notes ? ` — ${project.sold_notes}` : ''
        }`,
        amount: project.sold_price != null ? Number(project.sold_price) : null,
        reference: null,
        entity_type: 'project',
        entity_id: String(project.id),
      });
    }

    activities.sort((a, b) => {
      if (a.occurred_at === b.occurred_at) {
        return String(b.entity_id).localeCompare(String(a.entity_id), undefined, { numeric: true });
      }
      return a.occurred_at < b.occurred_at ? 1 : -1;
    });

    return {
      project_id: String(project.id),
      project_name: project.name,
      total: activities.length,
      activities,
    };
  }

  private normalizePlotSizeSqft(value: number | string | null): string | null {
    if (value === null || value === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException('plot_size_sqft must be a non-negative number');
    }
    return String(n);
  }

  async create(dto: CreateProjectDto) {
    if (!dto.name?.trim()) throw new BadRequestException('name is required');
    this.assertValidStatus(dto.status);
    const tax = this.validateTaxonomy(dto, true)!;
    const plotSizeSqft =
      dto.plot_size_sqft !== undefined
        ? this.normalizePlotSizeSqft(dto.plot_size_sqft)
        : null;
    const project = this.projectsRepo.create({
      name: dto.name.trim(),
      location: dto.location,
      plot_size: plotSizeSqft != null ? null : (dto.plot_size ?? null),
      plot_size_sqft: plotSizeSqft,
      start_date: dto.start_date,
      expected_completion_date: dto.expected_completion_date,
      project_type: tax.type,
      project_subtype: tax.subtype,
      project_strategy: tax.strategy,
      asset_class: deriveAssetClass(tax.subtype),
      project_category: null,
      project_purpose: null,
      total_estimated_budget:
        dto.total_estimated_budget != null && dto.total_estimated_budget !== ('' as unknown as number)
          ? String(dto.total_estimated_budget)
          : undefined,
      target_sale_price:
        dto.target_sale_price != null && dto.target_sale_price !== ('' as unknown as number)
          ? String(dto.target_sale_price)
          : undefined,
      status: dto.status || 'Planning',
      sold_as_is: false,
    });
    const saved = await this.projectsRepo.save(project);
    if (tax.strategy === 'DEVELOPMENT') {
      await this.seedDevelopmentStages(String(saved.id));
    }
    return this.findOne(String(saved.id));
  }

  async update(id: string, dto: Partial<CreateProjectDto>) {
    const existing = await this.findOne(id);
    this.assertValidStatus(dto.status);
    const normalizedExisting = normalizeTaxonomyInput({
      project_type: existing.project_type,
      project_category: existing.project_category,
      project_subtype: existing.project_subtype,
      project_strategy: existing.project_strategy,
      project_purpose: existing.project_purpose,
    });
    const normalizedDto = normalizeTaxonomyInput(dto);
    const merged = {
      project_type: normalizedDto.project_type ?? normalizedExisting.project_type,
      project_subtype: normalizedDto.project_subtype ?? normalizedExisting.project_subtype,
      project_strategy: normalizedDto.project_strategy ?? normalizedExisting.project_strategy,
    };
    const touchingTaxonomy =
      dto.project_type !== undefined ||
      dto.project_category !== undefined ||
      dto.project_subtype !== undefined ||
      dto.project_strategy !== undefined ||
      dto.project_purpose !== undefined;

    const updateData: Partial<Project> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.plot_size_sqft !== undefined) {
      updateData.plot_size_sqft = this.normalizePlotSizeSqft(dto.plot_size_sqft);
      if (updateData.plot_size_sqft != null) updateData.plot_size = null;
    } else if (dto.plot_size !== undefined) {
      updateData.plot_size = dto.plot_size;
    }
    if (dto.start_date !== undefined) updateData.start_date = dto.start_date;
    if (dto.expected_completion_date !== undefined)
      updateData.expected_completion_date = dto.expected_completion_date;
    if (dto.total_estimated_budget !== undefined)
      updateData.total_estimated_budget =
        dto.total_estimated_budget === null || dto.total_estimated_budget === ('' as unknown as number)
          ? null
          : String(dto.total_estimated_budget);
    if (dto.target_sale_price !== undefined)
      updateData.target_sale_price =
        dto.target_sale_price === null || dto.target_sale_price === ('' as unknown as number)
          ? null
          : String(dto.target_sale_price);
    if (dto.status !== undefined) updateData.status = dto.status;

    if (touchingTaxonomy || (merged.project_type && merged.project_subtype && merged.project_strategy)) {
      const tax = this.validateTaxonomy(merged, true)!;
      updateData.project_type = tax.type;
      updateData.project_subtype = tax.subtype;
      updateData.project_strategy = tax.strategy;
      updateData.asset_class = deriveAssetClass(tax.subtype);
      updateData.project_category = null;
      updateData.project_purpose = null;
    }

    await this.projectsRepo.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id); // throws 404 if not found

    // 1. Sales chain: installments → sales (via property_units of this project)
    await this.dataSource.query(`
      DELETE FROM sale_installments WHERE sale_id IN (
        SELECT s.id FROM sales s
        JOIN property_units pu ON s.property_unit_id = pu.id
        WHERE pu.project_id = $1)`, [id]);
    await this.dataSource.query(`
      DELETE FROM sales WHERE property_unit_id IN (
        SELECT id FROM property_units WHERE project_id = $1)`, [id]);
    await this.dataSource.query(`DELETE FROM property_units WHERE project_id = $1`, [id]);

    // 2. Procurement chain: po_items + receipts → purchase_orders
    await this.dataSource.query(`
      DELETE FROM po_items WHERE purchase_order_id IN (
        SELECT id FROM purchase_orders WHERE project_id = $1)`, [id]);
    await this.dataSource.query(`
      DELETE FROM material_receipts WHERE purchase_order_id IN (
        SELECT id FROM purchase_orders WHERE project_id = $1)`, [id]);
    await this.dataSource.query(`DELETE FROM purchase_orders WHERE project_id = $1`, [id]);

    // 3. Inventory movements
    await this.dataSource.query(`DELETE FROM stock_ledger WHERE project_id = $1`, [id]);
    await this.dataSource.query(`DELETE FROM material_issues WHERE project_id = $1`, [id]);

    // 4. Labour records
    await this.dataSource.query(`DELETE FROM labour_attendance WHERE project_id = $1`, [id]);
    await this.dataSource.query(`DELETE FROM labour_payments WHERE project_id = $1`, [id]);
    await this.dataSource.query(`DELETE FROM labour_advances WHERE project_id = $1`, [id]);

    // 5. Expenses & cashflow
    await this.dataSource.query(`
      DELETE FROM expense_payments WHERE expense_id IN (
        SELECT id FROM expenses WHERE project_id = $1)`, [id]);
    await this.dataSource.query(`DELETE FROM expenses WHERE project_id = $1`, [id]);
    await this.dataSource.query(`DELETE FROM cash_transactions WHERE project_id = $1`, [id]);

    // 6. Accounting
    await this.dataSource.query(`
      DELETE FROM journal_entry_lines WHERE journal_entry_id IN (
        SELECT id FROM journal_entries WHERE project_id = $1)`, [id]);
    await this.dataSource.query(`DELETE FROM journal_entries WHERE project_id = $1`, [id]);

    // 7. Stage chain: progress + budgets → stages
    await this.dataSource.query(`
      DELETE FROM stage_progress WHERE project_stage_id IN (
        SELECT id FROM project_stages WHERE project_id = $1)`, [id]);
    await this.dataSource.query(`
      DELETE FROM stage_budgets WHERE project_stage_id IN (
        SELECT id FROM project_stages WHERE project_id = $1)`, [id]);
    await this.dataSource.query(`DELETE FROM project_stages WHERE project_id = $1`, [id]);

    // 8. Finally delete the project
    await this.projectsRepo.delete(id);

    return { message: 'Project and all related data deleted successfully' };
  }

  async findStages(projectId: string) {
    await this.findOne(projectId);
    const stages = await this.stagesRepo.find({
      where: { project_id: projectId },
      relations: ['budget'],
      order: { sequence_order: 'ASC' },
    });
    const actuals = await this.loadStageActualCosts(projectId);
    return this.attachActualCosts(stages, actuals);
  }

  async sellDuringConstruction(id: string, dto: SellDuringConstructionDto) {
    const project = await this.projectsRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    if (project.project_strategy !== 'DEVELOPMENT') {
      throw new BadRequestException('Only DEVELOPMENT projects can be sold during construction');
    }
    if (STAGE_LOCKED_STATUSES.has(project.status) || project.status === 'Sold') {
      throw new BadRequestException(
        `Cannot sell during construction when status is "${project.status}"`,
      );
    }

    const buyer = dto.buyer_name?.trim();
    if (!buyer) throw new BadRequestException('buyer_name is required');

    let soldPrice: string | null = null;
    if (dto.sale_price != null && dto.sale_price !== ('' as unknown as number)) {
      const n = Number(dto.sale_price);
      if (!Number.isFinite(n) || n < 0) {
        throw new BadRequestException('sale_price must be a non-negative number');
      }
      soldPrice = String(n);
    }

    const saleDate =
      dto.sale_date?.trim() ||
      new Date().toISOString().slice(0, 10);

    await this.projectsRepo.update(id, {
      status: 'Sold During Construction',
      sold_as_is: true,
      sold_buyer_name: buyer,
      sold_price: soldPrice,
      sold_at: saleDate,
      sold_notes: dto.notes?.trim() || null,
    });

    return this.findOne(id);
  }

  async createStage(projectId: string, dto: CreateStageDto) {
    const project = await this.findOne(projectId);
    this.assertStagesEditable(project);
    const { labour_budget, material_budget, equipment_budget, other_budget, ...stageData } = dto;

    const stage = this.stagesRepo.create({
      project_id: projectId,
      name: stageData.name,
      description: stageData.description,
      sequence_order: stageData.sequence_order || 0,
      start_date: stageData.start_date,
      end_date: stageData.end_date,
      completion_percent: (stageData.completion_percent || 0).toString(),
      status: stageData.status || 'Planned',
    });
    const savedStage = await this.stagesRepo.save(stage);

    const lb = labour_budget || 0;
    const mb = material_budget || 0;
    const eb = equipment_budget || 0;
    const ob = other_budget || 0;
    const total = lb + mb + eb + ob;

    const budget = this.stageBudgetsRepo.create({
      project_stage_id: savedStage.id,
      labour_budget: lb.toString(),
      material_budget: mb.toString(),
      equipment_budget: eb.toString(),
      other_budget: ob.toString(),
      total_budget: total.toString(),
    });
    await this.stageBudgetsRepo.save(budget);

    return this.stagesRepo.findOne({
      where: { id: savedStage.id },
      relations: ['budget'],
    });
  }

  async updateStage(stageId: string, dto: Partial<CreateStageDto>) {
    const stage = await this.stagesRepo.findOne({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage not found');
    const project = await this.findOne(stage.project_id);
    this.assertStagesEditable(project);

    const { labour_budget, material_budget, equipment_budget, other_budget, ...stageData } = dto;

    const updateData: Partial<ProjectStage> = {};
    if (stageData.name !== undefined) updateData.name = stageData.name;
    if (stageData.description !== undefined) updateData.description = stageData.description;
    if (stageData.sequence_order !== undefined) updateData.sequence_order = stageData.sequence_order;
    if (stageData.start_date !== undefined) updateData.start_date = stageData.start_date;
    if (stageData.end_date !== undefined) updateData.end_date = stageData.end_date;
    if (stageData.completion_percent !== undefined)
      updateData.completion_percent = stageData.completion_percent.toString();
    if (stageData.status !== undefined) updateData.status = stageData.status;

    if (Object.keys(updateData).length > 0) {
      await this.stagesRepo.update(stageId, updateData);
    }

    if (
      labour_budget !== undefined ||
      material_budget !== undefined ||
      equipment_budget !== undefined ||
      other_budget !== undefined
    ) {
      const existing = await this.stageBudgetsRepo.findOne({
        where: { project_stage_id: stageId },
      });
      if (existing) {
        const lb = labour_budget ?? Number(existing.labour_budget);
        const mb = material_budget ?? Number(existing.material_budget);
        const eb = equipment_budget ?? Number(existing.equipment_budget);
        const ob = other_budget ?? Number(existing.other_budget);
        await this.stageBudgetsRepo.update(existing.id, {
          labour_budget: lb.toString(),
          material_budget: mb.toString(),
          equipment_budget: eb.toString(),
          other_budget: ob.toString(),
          total_budget: (lb + mb + eb + ob).toString(),
        });
      }
    }

    return this.stagesRepo.findOne({
      where: { id: stageId },
      relations: ['budget'],
    });
  }

  private async loadProjectFinancials(projectId?: string) {
    const params: string[] = [];
    let where = '';
    if (projectId) {
      params.push(projectId);
      where = ` WHERE p.id = $1`;
    }
    const rows: Array<{
      id: string;
      total_spent: string;
      total_collected: string;
      sold_value: string;
      fund_receipts: string;
    }> = await this.dataSource.query(
      `
      SELECT p.id::text AS id,
        COALESCE((SELECT SUM(CAST(e.amount AS NUMERIC)) FROM expenses e WHERE e.project_id = p.id), 0) AS total_spent,
        COALESCE((
          SELECT SUM(CAST(s.total_paid AS NUMERIC)) FROM sales s
          JOIN property_units pu ON pu.id = s.property_unit_id
          WHERE pu.project_id = p.id AND s.status != 'Cancelled'
        ), 0) AS total_collected,
        (
          COALESCE((
            SELECT SUM(CAST(s.total_sale_price AS NUMERIC)) FROM sales s
            JOIN property_units pu ON pu.id = s.property_unit_id
            WHERE pu.project_id = p.id AND s.status != 'Cancelled'
          ), 0)
          + CASE
              WHEN p.sold_as_is = true AND p.sold_price IS NOT NULL
              THEN CAST(p.sold_price AS NUMERIC)
              ELSE 0
            END
        ) AS sold_value,
        COALESCE((
          SELECT SUM(CAST(ft.amount AS NUMERIC)) FROM fund_transactions ft
          JOIN fund_sources fs ON fs.id = ft.fund_source_id
          WHERE fs.project_id = p.id
        ), 0) AS fund_receipts
      FROM projects p
      ${where}
      `,
      params,
    );
    return new Map(rows.map((r) => [String(r.id), r]));
  }

  private enrichProject(
    project: Project,
    financials?: {
      total_spent: string;
      total_collected: string;
      sold_value: string;
      fund_receipts: string;
    },
  ) {
    const stages = project.stages || [];
    const totalBudget = stages.reduce(
      (sum, s) => sum + Number(s.budget?.total_budget || 0),
      0,
    );
    const avgCompletion =
      stages.length > 0
        ? stages.reduce((sum, s) => sum + Number(s.completion_percent || 0), 0) /
          stages.length
        : 0;

    const budget = Number(project.total_estimated_budget || totalBudget || 0);
    const targetSale = Number(project.target_sale_price || 0);
    const totalSpent = Number(financials?.total_spent || 0);
    const totalCollected = Number(financials?.total_collected || 0);
    const soldValue = Number(financials?.sold_value || 0);
    const fundReceipts = Number(financials?.fund_receipts || 0);
    const collectionBase = targetSale > 0 ? targetSale : soldValue;
    // Profitability = sales created against project − project expenses (not collections)
    const profit = soldValue - totalSpent;

    return {
      ...project,
      computed: {
        total_stage_budget: totalBudget,
        avg_completion_percent: Math.round(avgCompletion * 100) / 100,
        stage_count: stages.length,
        total_spent: totalSpent,
        total_collected: totalCollected,
        sold_value: soldValue,
        profit,
        profit_margin_pct:
          soldValue > 0 ? Math.round((profit / soldValue) * 100) : 0,
        fund_receipts: fundReceipts,
        budget_used_pct: budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0,
        collection_pct:
          collectionBase > 0
            ? Math.min(100, Math.round((totalCollected / collectionBase) * 100))
            : 0,
      },
    };
  }
}
