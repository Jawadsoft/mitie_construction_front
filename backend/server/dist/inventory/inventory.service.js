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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const material_entity_1 = require("./entities/material.entity");
const stock_ledger_entity_1 = require("./entities/stock-ledger.entity");
const material_issue_entity_1 = require("./entities/material-issue.entity");
const SEED_MATERIALS = [
    { name: 'OPC Cement (50kg bag)', unit: 'bags', category: 'Cement & Binding', min_stock_level: '100', standard_unit_cost: '900', description: 'Ordinary Portland Cement 50kg' },
    { name: 'White Cement (50kg bag)', unit: 'bags', category: 'Cement & Binding', min_stock_level: '20', standard_unit_cost: '1400', description: 'White Portland Cement' },
    { name: 'Tile Adhesive', unit: 'bags', category: 'Cement & Binding', min_stock_level: '20', standard_unit_cost: '750', description: 'Ceramic tile adhesive 25kg bag' },
    { name: 'Bonding Agent', unit: 'liter', category: 'Cement & Binding', min_stock_level: '10', standard_unit_cost: '350', description: 'Concrete bonding agent' },
    { name: 'Steel Rebar 10mm', unit: 'kg', category: 'Steel & Iron', min_stock_level: '500', standard_unit_cost: '270', description: 'Mild steel deformed bar 10mm' },
    { name: 'Steel Rebar 12mm', unit: 'kg', category: 'Steel & Iron', min_stock_level: '500', standard_unit_cost: '275', description: 'Mild steel deformed bar 12mm' },
    { name: 'Steel Rebar 16mm', unit: 'kg', category: 'Steel & Iron', min_stock_level: '300', standard_unit_cost: '278', description: 'Mild steel deformed bar 16mm' },
    { name: 'Steel Rebar 20mm', unit: 'kg', category: 'Steel & Iron', min_stock_level: '200', standard_unit_cost: '280', description: 'Mild steel deformed bar 20mm' },
    { name: 'Binding Wire', unit: 'kg', category: 'Steel & Iron', min_stock_level: '50', standard_unit_cost: '320', description: 'Galvanized binding wire for rebar tying' },
    { name: 'GI Pipe 1 inch', unit: 'rft', category: 'Steel & Iron', min_stock_level: '100', standard_unit_cost: '180', description: 'Galvanized Iron pipe 1 inch dia' },
    { name: 'GI Pipe 1.5 inch', unit: 'rft', category: 'Steel & Iron', min_stock_level: '50', standard_unit_cost: '260', description: 'Galvanized Iron pipe 1.5 inch dia' },
    { name: 'GI Sheet (18 gauge)', unit: 'sheets', category: 'Steel & Iron', min_stock_level: '20', standard_unit_cost: '2800', description: 'GI corrugated sheet 8x3 ft' },
    { name: 'Red Clay Bricks', unit: 'nos', category: 'Bricks & Blocks', min_stock_level: '2000', standard_unit_cost: '12', description: 'Standard 9x4.5x3 inch red clay brick' },
    { name: 'Concrete Block (6 inch)', unit: 'nos', category: 'Bricks & Blocks', min_stock_level: '500', standard_unit_cost: '65', description: 'Hollow concrete block 6 inch' },
    { name: 'Concrete Block (8 inch)', unit: 'nos', category: 'Bricks & Blocks', min_stock_level: '200', standard_unit_cost: '85', description: 'Hollow concrete block 8 inch' },
    { name: 'Fine Sand (Ravi)', unit: 'cubic ft', category: 'Sand & Aggregate', min_stock_level: '100', standard_unit_cost: '85', description: 'Fine river sand for plastering' },
    { name: 'Coarse Sand', unit: 'cubic ft', category: 'Sand & Aggregate', min_stock_level: '100', standard_unit_cost: '75', description: 'Coarse sand for concrete' },
    { name: 'Crush (3/4 inch)', unit: 'cubic ft', category: 'Sand & Aggregate', min_stock_level: '200', standard_unit_cost: '120', description: '3/4 inch crushed stone aggregate' },
    { name: 'Crush (1.5 inch)', unit: 'cubic ft', category: 'Sand & Aggregate', min_stock_level: '100', standard_unit_cost: '110', description: '1.5 inch crushed stone aggregate' },
    { name: 'Bajri (Gravel)', unit: 'cubic ft', category: 'Sand & Aggregate', min_stock_level: '50', standard_unit_cost: '90', description: 'River gravel / bajri' },
    { name: 'Murram / Sub-base', unit: 'cubic ft', category: 'Sand & Aggregate', min_stock_level: '50', standard_unit_cost: '45', description: 'Murram for sub-base filling' },
    { name: 'Shutter Ply 18mm', unit: 'sheets', category: 'Timber & Wood', min_stock_level: '20', standard_unit_cost: '4200', description: 'Film-faced shutter plywood 8x4 ft' },
    { name: 'Wooden Batten 3x1.5', unit: 'rft', category: 'Timber & Wood', min_stock_level: '200', standard_unit_cost: '55', description: '3x1.5 inch wooden batten for centering' },
    { name: 'Steel Props / Jacks', unit: 'nos', category: 'Timber & Wood', min_stock_level: '10', standard_unit_cost: '1800', description: 'Adjustable steel props for slab shuttering' },
    { name: 'Doka Panel (1.2x2.4m)', unit: 'nos', category: 'Timber & Wood', min_stock_level: '10', standard_unit_cost: '9500', description: 'Doka / Peri formwork panel' },
    { name: 'Waterproofing Compound', unit: 'kg', category: 'Finishing', min_stock_level: '50', standard_unit_cost: '180', description: 'Cementitious waterproofing powder' },
    { name: 'Bitumen (Grade 60/70)', unit: 'kg', category: 'Finishing', min_stock_level: '100', standard_unit_cost: '160', description: 'Oxidized bitumen for waterproofing' },
    { name: 'SBR Latex', unit: 'liter', category: 'Finishing', min_stock_level: '20', standard_unit_cost: '320', description: 'Styrene Butadiene Rubber for waterproofing' },
    { name: 'Polyurethane Sealant', unit: 'nos', category: 'Finishing', min_stock_level: '10', standard_unit_cost: '750', description: 'PU sealant tube 600ml' },
    { name: 'uPVC Pipe 4 inch', unit: 'rft', category: 'Plumbing', min_stock_level: '50', standard_unit_cost: '220', description: 'uPVC drainage pipe 4 inch' },
    { name: 'uPVC Pipe 3 inch', unit: 'rft', category: 'Plumbing', min_stock_level: '30', standard_unit_cost: '150', description: 'uPVC drainage pipe 3 inch' },
    { name: 'CPVC Pipe 0.5 inch', unit: 'rft', category: 'Plumbing', min_stock_level: '100', standard_unit_cost: '55', description: 'CPVC hot/cold water pipe 0.5 inch' },
    { name: 'CPVC Pipe 0.75 inch', unit: 'rft', category: 'Plumbing', min_stock_level: '50', standard_unit_cost: '80', description: 'CPVC hot/cold water pipe 0.75 inch' },
    { name: 'Water Tank (500 Gallon)', unit: 'nos', category: 'Plumbing', min_stock_level: '2', standard_unit_cost: '12000', description: 'Plastic water storage tank 500 gal' },
    { name: 'Gate Valve 0.5 inch', unit: 'nos', category: 'Plumbing', min_stock_level: '10', standard_unit_cost: '250', description: 'Brass gate valve 0.5 inch' },
    { name: 'Copper Wire 7/44', unit: 'rft', category: 'Electrical', min_stock_level: '200', standard_unit_cost: '55', description: 'Single core copper wire 7/44' },
    { name: 'Copper Wire 3/29', unit: 'rft', category: 'Electrical', min_stock_level: '300', standard_unit_cost: '28', description: 'Single core copper wire 3/29' },
    { name: 'Conduit Pipe (20mm)', unit: 'rft', category: 'Electrical', min_stock_level: '100', standard_unit_cost: '18', description: 'PVC electrical conduit 20mm' },
    { name: 'MCB (Single Pole)', unit: 'nos', category: 'Electrical', min_stock_level: '20', standard_unit_cost: '450', description: 'Miniature circuit breaker 10A/16A' },
    { name: 'DB Box (6 way)', unit: 'nos', category: 'Electrical', min_stock_level: '5', standard_unit_cost: '2800', description: 'Distribution board 6-way flush mount' },
    { name: 'Switch Socket Plate', unit: 'nos', category: 'Electrical', min_stock_level: '20', standard_unit_cost: '380', description: 'Modular switch socket plate 3x3' },
    { name: 'Ceramic Floor Tile (12x12)', unit: 'sft', category: 'Finishing', min_stock_level: '100', standard_unit_cost: '85', description: 'Ceramic floor tile 12x12 inch' },
    { name: 'Ceramic Wall Tile (8x12)', unit: 'sft', category: 'Finishing', min_stock_level: '50', standard_unit_cost: '95', description: 'Ceramic wall tile 8x12 inch' },
    { name: 'Porcelain Tile (24x24)', unit: 'sft', category: 'Finishing', min_stock_level: '50', standard_unit_cost: '180', description: 'Porcelain polished floor tile' },
    { name: 'Marble (Local White)', unit: 'sft', category: 'Finishing', min_stock_level: '20', standard_unit_cost: '320', description: 'Local white marble slab 1 inch thick' },
    { name: 'Gypsum Plaster (25kg)', unit: 'bags', category: 'Finishing', min_stock_level: '30', standard_unit_cost: '650', description: 'Machine-applied gypsum plaster' },
    { name: 'Emulsion Paint (20L)', unit: 'nos', category: 'Finishing', min_stock_level: '10', standard_unit_cost: '4500', description: 'Interior emulsion paint 20 liter' },
    { name: 'Exterior Paint (20L)', unit: 'nos', category: 'Finishing', min_stock_level: '5', standard_unit_cost: '6500', description: 'Weather-resistant exterior paint' },
    { name: 'Wall Putty (40kg)', unit: 'bags', category: 'Finishing', min_stock_level: '20', standard_unit_cost: '900', description: 'Acrylic wall putty 40kg bag' },
    { name: 'POP (Plaster of Paris)', unit: 'bags', category: 'Finishing', min_stock_level: '20', standard_unit_cost: '350', description: 'Plaster of Paris 30kg bag' },
    { name: 'Nails (4 inch)', unit: 'kg', category: 'Hardware', min_stock_level: '20', standard_unit_cost: '200', description: 'Common wire nails 4 inch' },
    { name: 'Nails (3 inch)', unit: 'kg', category: 'Hardware', min_stock_level: '20', standard_unit_cost: '200', description: 'Common wire nails 3 inch' },
    { name: 'Anchor Bolts (M10)', unit: 'nos', category: 'Hardware', min_stock_level: '50', standard_unit_cost: '45', description: 'Chemical anchor bolt M10x100mm' },
    { name: 'Door Hinges (4 inch)', unit: 'nos', category: 'Hardware', min_stock_level: '20', standard_unit_cost: '180', description: 'SS door hinge 4 inch pair' },
    { name: 'Door Lock Set', unit: 'nos', category: 'Hardware', min_stock_level: '5', standard_unit_cost: '1800', description: 'Mortise lock set with handles' },
    { name: 'Grinding Disc', unit: 'nos', category: 'Hardware', min_stock_level: '20', standard_unit_cost: '120', description: 'Angle grinder cutting disc 4 inch' },
    { name: 'Safety Helmet', unit: 'nos', category: 'Safety', min_stock_level: '10', standard_unit_cost: '350', description: 'Hard hat safety helmet' },
    { name: 'Safety Shoes', unit: 'nos', category: 'Safety', min_stock_level: '5', standard_unit_cost: '2200', description: 'Steel-toe safety shoes' },
    { name: 'Reflective Jacket', unit: 'nos', category: 'Safety', min_stock_level: '10', standard_unit_cost: '450', description: 'Hi-vis reflective safety vest' },
    { name: 'Safety Net', unit: 'sft', category: 'Safety', min_stock_level: '100', standard_unit_cost: '25', description: 'Construction safety netting' },
    { name: 'Rubber Gloves', unit: 'nos', category: 'Safety', min_stock_level: '20', standard_unit_cost: '120', description: 'Heavy-duty rubber work gloves' },
];
let InventoryService = class InventoryService {
    materialRepo;
    ledgerRepo;
    issueRepo;
    ds;
    constructor(materialRepo, ledgerRepo, issueRepo, ds) {
        this.materialRepo = materialRepo;
        this.ledgerRepo = ledgerRepo;
        this.issueRepo = issueRepo;
        this.ds = ds;
    }
    async onModuleInit() {
        let seeded = 0;
        for (const m of SEED_MATERIALS) {
            try {
                const exists = await this.materialRepo.findOne({ where: { name: m.name } });
                if (!exists) {
                    await this.materialRepo.save(this.materialRepo.create(m));
                    seeded++;
                }
            }
            catch {
            }
        }
        if (seeded > 0)
            console.log(`Seeded ${seeded} predefined materials into catalog.`);
    }
    findAllMaterials(category) {
        const q = this.materialRepo.createQueryBuilder('m').orderBy('m.category').addOrderBy('m.name');
        if (category)
            q.andWhere('m.category = :cat', { cat: category });
        return q.getMany();
    }
    async findOneMaterial(id) {
        const m = await this.materialRepo.findOne({ where: { id } });
        if (!m)
            throw new common_1.NotFoundException('Material not found');
        return m;
    }
    async createMaterial(dto) {
        return this.materialRepo.save(this.materialRepo.create(dto));
    }
    async updateMaterial(id, dto) {
        await this.findOneMaterial(id);
        await this.materialRepo.update(id, dto);
        return this.findOneMaterial(id);
    }
    async getStockSummary(project_id) {
        const projectWhere = project_id ? `AND sl.project_id = $1` : '';
        const params = project_id ? [project_id] : [];
        const rows = await this.ds.query(`
      SELECT
        m.id AS material_id,
        m.name AS material_name,
        m.unit,
        m.category,
        m.min_stock_level,
        m.standard_unit_cost,
        COALESCE(SUM(CASE
          WHEN sl.movement_type IN ('RECEIPT','TRANSFER_IN','ADJUSTMENT','RETURN')
          THEN CAST(sl.quantity AS NUMERIC)
          ELSE 0
        END), 0) AS total_in,
        COALESCE(SUM(CASE
          WHEN sl.movement_type IN ('ISSUE','TRANSFER_OUT')
          THEN CAST(sl.quantity AS NUMERIC)
          ELSE 0
        END), 0) AS total_out,
        COALESCE(SUM(CASE
          WHEN sl.movement_type IN ('RECEIPT','TRANSFER_IN','ADJUSTMENT','RETURN')
          THEN CAST(sl.quantity AS NUMERIC)
          WHEN sl.movement_type IN ('ISSUE','TRANSFER_OUT')
          THEN -CAST(sl.quantity AS NUMERIC)
          ELSE 0
        END), 0) AS current_stock,
        COALESCE(SUM(CASE
          WHEN sl.movement_type IN ('RECEIPT','TRANSFER_IN','ADJUSTMENT','RETURN')
          THEN CAST(sl.total_cost AS NUMERIC)
          WHEN sl.movement_type IN ('ISSUE','TRANSFER_OUT')
          THEN -CAST(sl.total_cost AS NUMERIC)
          ELSE 0
        END), 0) AS stock_value
      FROM materials m
      LEFT JOIN stock_ledger sl ON sl.material_id = m.id ${projectWhere}
      WHERE m.is_active = true
      GROUP BY m.id, m.name, m.unit, m.category, m.min_stock_level, m.standard_unit_cost
      ORDER BY m.category, m.name
    `, params);
        return rows.map((r) => ({
            ...r,
            total_in: Number(r.total_in),
            total_out: Number(r.total_out),
            current_stock: Number(r.current_stock),
            stock_value: Number(r.stock_value),
            min_stock_level: Number(r.min_stock_level),
            standard_unit_cost: Number(r.standard_unit_cost),
            is_low_stock: Number(r.current_stock) <= Number(r.min_stock_level) && Number(r.min_stock_level) > 0,
        }));
    }
    async getStockByMaterial(material_id) {
        const ledger = await this.ledgerRepo.find({ where: { material_id }, order: { movement_date: 'DESC', created_at: 'DESC' } });
        const [summary] = await this.getStockSummary();
        return { ledger, summary };
    }
    async receiveStock(dto) {
        await this.findOneMaterial(dto.material_id);
        const total_cost = (Number(dto.quantity) * Number(dto.unit_cost)).toFixed(2);
        return this.ledgerRepo.save(this.ledgerRepo.create({
            material_id: dto.material_id,
            movement_type: 'RECEIPT',
            quantity: dto.quantity,
            unit_cost: dto.unit_cost,
            total_cost,
            project_id: dto.project_id ?? null,
            purchase_order_id: dto.purchase_order_id ?? null,
            movement_date: dto.movement_date,
            reference_no: dto.reference_no ?? null,
            notes: dto.notes ?? null,
        }));
    }
    async issueMaterial(dto) {
        const stock = await this.getStockSummary();
        const materialStock = stock.find((s) => s.material_id == dto.material_id);
        const currentStock = materialStock?.current_stock ?? 0;
        if (currentStock < Number(dto.quantity)) {
            throw new common_1.BadRequestException(`Insufficient stock. Available: ${currentStock}, Requested: ${dto.quantity}`);
        }
        const unitCost = dto.unit_cost ?? materialStock?.standard_unit_cost?.toString() ?? '0';
        const total_cost = (Number(dto.quantity) * Number(unitCost)).toFixed(2);
        await this.ledgerRepo.save(this.ledgerRepo.create({
            material_id: dto.material_id,
            movement_type: 'ISSUE',
            quantity: dto.quantity,
            unit_cost: unitCost,
            total_cost,
            project_id: dto.project_id,
            project_stage_id: dto.project_stage_id ?? null,
            movement_date: dto.issue_date,
            reference_no: dto.reference_no ?? null,
            notes: dto.notes ?? null,
        }));
        return this.issueRepo.save(this.issueRepo.create({
            material_id: dto.material_id,
            project_id: dto.project_id,
            project_stage_id: dto.project_stage_id ?? null,
            issue_date: dto.issue_date,
            quantity: dto.quantity,
            unit_cost: unitCost,
            total_cost,
            purpose: dto.purpose ?? null,
            reference_no: dto.reference_no ?? null,
            notes: dto.notes ?? null,
        }));
    }
    async adjustStock(dto) {
        await this.findOneMaterial(dto.material_id);
        const unitCost = dto.unit_cost ?? '0';
        const total_cost = (Number(dto.quantity) * Number(unitCost)).toFixed(2);
        return this.ledgerRepo.save(this.ledgerRepo.create({
            material_id: dto.material_id,
            movement_type: dto.movement_type,
            quantity: dto.quantity,
            unit_cost: unitCost,
            total_cost,
            movement_date: dto.movement_date,
            notes: dto.notes ?? null,
        }));
    }
    getLedger(filters) {
        const q = this.ledgerRepo.createQueryBuilder('sl')
            .leftJoinAndSelect('sl.material', 'material')
            .orderBy('sl.movement_date', 'DESC')
            .addOrderBy('sl.created_at', 'DESC');
        if (filters.material_id)
            q.andWhere('sl.material_id = :mid', { mid: filters.material_id });
        if (filters.project_id)
            q.andWhere('sl.project_id = :pid', { pid: filters.project_id });
        if (filters.movement_type)
            q.andWhere('sl.movement_type = :mt', { mt: filters.movement_type });
        if (filters.from)
            q.andWhere('sl.movement_date >= :from', { from: filters.from });
        if (filters.to)
            q.andWhere('sl.movement_date <= :to', { to: filters.to });
        return q.getMany();
    }
    getIssues(filters) {
        const q = this.issueRepo.createQueryBuilder('i')
            .leftJoinAndSelect('i.material', 'material')
            .orderBy('i.issue_date', 'DESC');
        if (filters.project_id)
            q.andWhere('i.project_id = :pid', { pid: filters.project_id });
        if (filters.project_stage_id)
            q.andWhere('i.project_stage_id = :sid', { sid: filters.project_stage_id });
        if (filters.material_id)
            q.andWhere('i.material_id = :mid', { mid: filters.material_id });
        return q.getMany();
    }
    async getProjectUtilization(project_id) {
        const rows = await this.ds.query(`
      SELECT
        m.id AS material_id,
        m.name AS material_name,
        m.unit,
        m.category,
        ps.id AS stage_id,
        ps.name AS stage_name,
        SUM(CAST(mi.quantity AS NUMERIC)) AS total_qty,
        SUM(CAST(mi.total_cost AS NUMERIC)) AS total_cost
      FROM material_issues mi
      JOIN materials m ON m.id = mi.material_id
      LEFT JOIN project_stages ps ON ps.id = mi.project_stage_id
      WHERE mi.project_id = $1
      GROUP BY m.id, m.name, m.unit, m.category, ps.id, ps.name
      ORDER BY total_cost DESC
    `, [project_id]);
        const totalCost = rows.reduce((s, r) => s + Number(r.total_cost), 0);
        const byMaterial = {};
        for (const r of rows) {
            if (!byMaterial[r.material_id]) {
                byMaterial[r.material_id] = {
                    material_id: r.material_id, material_name: r.material_name,
                    unit: r.unit, category: r.category,
                    total_qty: 0, total_cost: 0, stages: [],
                };
            }
            byMaterial[r.material_id].total_qty += Number(r.total_qty);
            byMaterial[r.material_id].total_cost += Number(r.total_cost);
            if (r.stage_id) {
                byMaterial[r.material_id].stages.push({
                    stage_id: r.stage_id, stage_name: r.stage_name,
                    qty: Number(r.total_qty), cost: Number(r.total_cost),
                });
            }
        }
        return {
            project_id,
            total_material_cost: totalCost,
            by_material: Object.values(byMaterial),
        };
    }
    async getLowStockAlerts() {
        const all = await this.getStockSummary();
        return all.filter((m) => m.is_low_stock);
    }
    async getCategories() {
        const rows = await this.ds.query(`SELECT DISTINCT category FROM materials WHERE category IS NOT NULL ORDER BY category`);
        return rows.map((r) => r.category);
    }
    async deleteMaterial(id) {
        await this.materialRepo.delete(id);
        return { deleted: true };
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(material_entity_1.Material)),
    __param(1, (0, typeorm_1.InjectRepository)(stock_ledger_entity_1.StockLedger)),
    __param(2, (0, typeorm_1.InjectRepository)(material_issue_entity_1.MaterialIssue)),
    __param(3, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map