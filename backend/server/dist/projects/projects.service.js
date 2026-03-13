"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const project_entity_1 = require("./entities/project.entity");
const project_stage_entity_1 = require("./entities/project-stage.entity");
const stage_budget_entity_1 = require("./entities/stage-budget.entity");
let ProjectsService = class ProjectsService {
    projectsRepo;
    stagesRepo;
    stageBudgetsRepo;
    dataSource;
    constructor(projectsRepo, stagesRepo, stageBudgetsRepo, dataSource) {
        this.projectsRepo = projectsRepo;
        this.stagesRepo = stagesRepo;
        this.stageBudgetsRepo = stageBudgetsRepo;
        this.dataSource = dataSource;
    }
    async findAll() {
        const projects = await this.projectsRepo.find({
            relations: ['stages', 'stages.budget'],
            order: { created_at: 'DESC' },
        });
        return projects.map((p) => this.enrichProject(p));
    }
    async findOne(id) {
        const project = await this.projectsRepo.findOne({
            where: { id },
            relations: ['stages', 'stages.budget', 'stages.progressLogs'],
        });
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        return this.enrichProject(project);
    }
    async create(dto) {
        const project = this.projectsRepo.create({
            name: dto.name,
            location: dto.location,
            plot_size: dto.plot_size,
            start_date: dto.start_date,
            expected_completion_date: dto.expected_completion_date,
            project_type: dto.project_type,
            total_estimated_budget: dto.total_estimated_budget?.toString(),
            status: dto.status || 'Planning',
        });
        return this.projectsRepo.save(project);
    }
    async update(id, dto) {
        const updateData = {};
        if (dto.name !== undefined)
            updateData.name = dto.name;
        if (dto.location !== undefined)
            updateData.location = dto.location;
        if (dto.plot_size !== undefined)
            updateData.plot_size = dto.plot_size;
        if (dto.start_date !== undefined)
            updateData.start_date = dto.start_date;
        if (dto.expected_completion_date !== undefined)
            updateData.expected_completion_date = dto.expected_completion_date;
        if (dto.project_type !== undefined)
            updateData.project_type = dto.project_type;
        if (dto.total_estimated_budget !== undefined)
            updateData.total_estimated_budget = dto.total_estimated_budget.toString();
        if (dto.status !== undefined)
            updateData.status = dto.status;
        await this.projectsRepo.update(id, updateData);
        return this.findOne(id);
    }
    async remove(id) {
        await this.findOne(id);
        await this.dataSource.query(`
      DELETE FROM sale_installments WHERE sale_id IN (
        SELECT s.id FROM sales s
        JOIN property_units pu ON s.property_unit_id = pu.id
        WHERE pu.project_id = $1)`, [id]);
        await this.dataSource.query(`
      DELETE FROM sales WHERE property_unit_id IN (
        SELECT id FROM property_units WHERE project_id = $1)`, [id]);
        await this.dataSource.query(`DELETE FROM property_units WHERE project_id = $1`, [id]);
        await this.dataSource.query(`
      DELETE FROM po_items WHERE purchase_order_id IN (
        SELECT id FROM purchase_orders WHERE project_id = $1)`, [id]);
        await this.dataSource.query(`
      DELETE FROM material_receipts WHERE purchase_order_id IN (
        SELECT id FROM purchase_orders WHERE project_id = $1)`, [id]);
        await this.dataSource.query(`DELETE FROM purchase_orders WHERE project_id = $1`, [id]);
        await this.dataSource.query(`DELETE FROM stock_ledger WHERE project_id = $1`, [id]);
        await this.dataSource.query(`DELETE FROM material_issues WHERE project_id = $1`, [id]);
        await this.dataSource.query(`DELETE FROM labour_attendance WHERE project_id = $1`, [id]);
        await this.dataSource.query(`DELETE FROM labour_payments WHERE project_id = $1`, [id]);
        await this.dataSource.query(`DELETE FROM labour_advances WHERE project_id = $1`, [id]);
        await this.dataSource.query(`DELETE FROM expenses WHERE project_id = $1`, [id]);
        await this.dataSource.query(`DELETE FROM cash_transactions WHERE project_id = $1`, [id]);
        await this.dataSource.query(`
      DELETE FROM journal_entry_lines WHERE journal_entry_id IN (
        SELECT id FROM journal_entries WHERE project_id = $1)`, [id]);
        await this.dataSource.query(`DELETE FROM journal_entries WHERE project_id = $1`, [id]);
        await this.dataSource.query(`
      DELETE FROM stage_progress WHERE project_stage_id IN (
        SELECT id FROM project_stages WHERE project_id = $1)`, [id]);
        await this.dataSource.query(`
      DELETE FROM stage_budgets WHERE project_stage_id IN (
        SELECT id FROM project_stages WHERE project_id = $1)`, [id]);
        await this.dataSource.query(`DELETE FROM project_stages WHERE project_id = $1`, [id]);
        await this.projectsRepo.delete(id);
        return { message: 'Project and all related data deleted successfully' };
    }
    async findStages(projectId) {
        await this.findOne(projectId);
        return this.stagesRepo.find({
            where: { project_id: projectId },
            relations: ['budget'],
            order: { sequence_order: 'ASC' },
        });
    }
    async createStage(projectId, dto) {
        await this.findOne(projectId);
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
    async updateStage(stageId, dto) {
        const { labour_budget, material_budget, equipment_budget, other_budget, ...stageData } = dto;
        const updateData = {};
        if (stageData.name !== undefined)
            updateData.name = stageData.name;
        if (stageData.description !== undefined)
            updateData.description = stageData.description;
        if (stageData.sequence_order !== undefined)
            updateData.sequence_order = stageData.sequence_order;
        if (stageData.start_date !== undefined)
            updateData.start_date = stageData.start_date;
        if (stageData.end_date !== undefined)
            updateData.end_date = stageData.end_date;
        if (stageData.completion_percent !== undefined)
            updateData.completion_percent = stageData.completion_percent.toString();
        if (stageData.status !== undefined)
            updateData.status = stageData.status;
        if (Object.keys(updateData).length > 0) {
            await this.stagesRepo.update(stageId, updateData);
        }
        if (labour_budget !== undefined ||
            material_budget !== undefined ||
            equipment_budget !== undefined ||
            other_budget !== undefined) {
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
    enrichProject(project) {
        const stages = project.stages || [];
        const totalBudget = stages.reduce((sum, s) => sum + Number(s.budget?.total_budget || 0), 0);
        const avgCompletion = stages.length > 0
            ? stages.reduce((sum, s) => sum + Number(s.completion_percent || 0), 0) /
                stages.length
            : 0;
        return {
            ...project,
            computed: {
                total_stage_budget: totalBudget,
                avg_completion_percent: Math.round(avgCompletion * 100) / 100,
                stage_count: stages.length,
            },
        };
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(1, (0, typeorm_1.InjectRepository)(project_stage_entity_1.ProjectStage)),
    __param(2, (0, typeorm_1.InjectRepository)(stage_budget_entity_1.StageBudget)),
    __param(3, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map