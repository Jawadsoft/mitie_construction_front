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
exports.FundsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const typeorm_3 = require("typeorm");
const fund_source_entity_1 = require("./entities/fund-source.entity");
const fund_transaction_entity_1 = require("./entities/fund-transaction.entity");
let FundsService = class FundsService {
    sourcesRepo;
    txRepo;
    dataSource;
    constructor(sourcesRepo, txRepo, dataSource) {
        this.sourcesRepo = sourcesRepo;
        this.txRepo = txRepo;
        this.dataSource = dataSource;
    }
    async findSources(project_id) {
        let sql = `
      SELECT fs.*,
             COALESCE(SUM(ft.amount), 0) AS received_so_far
      FROM fund_sources fs
      LEFT JOIN fund_transactions ft ON ft.fund_source_id = fs.id
    `;
        const params = [];
        if (project_id) {
            sql += ' WHERE fs.project_id = $1';
            params.push(project_id);
        }
        sql += ' GROUP BY fs.id ORDER BY fs.created_at DESC';
        return this.dataSource.query(sql, params);
    }
    async findOneSource(id) {
        const s = await this.sourcesRepo.findOne({ where: { id } });
        if (!s)
            throw new common_1.NotFoundException('Fund source not found');
        return s;
    }
    createSource(dto) { return this.sourcesRepo.save(this.sourcesRepo.create(dto)); }
    async updateSource(id, dto) {
        await this.sourcesRepo.update(id, dto);
        return this.findOneSource(id);
    }
    findTransactions(fund_source_id) {
        const q = this.txRepo.createQueryBuilder('ft').leftJoinAndSelect('ft.fund_source', 'fund_source').orderBy('ft.transaction_date', 'DESC');
        if (fund_source_id)
            q.andWhere('ft.fund_source_id = :id', { id: fund_source_id });
        return q.getMany();
    }
    async createTransaction(dto) {
        const tx = await this.txRepo.save(this.txRepo.create(dto));
        await this.sourcesRepo.query(`UPDATE fund_sources SET received_so_far = received_so_far + $1 WHERE id = $2`, [dto.amount, dto.fund_source_id]);
        return tx;
    }
    async deleteSource(id) {
        await this.sourcesRepo.delete(id);
        return { deleted: true };
    }
    async updateTransaction(id, dto) {
        const old = await this.txRepo.findOne({ where: { id } });
        await this.txRepo.update(id, dto);
        if (old && dto.amount !== undefined) {
            const diff = Number(dto.amount) - Number(old.amount);
            if (diff !== 0) {
                await this.dataSource.query(`UPDATE fund_sources SET received_so_far = received_so_far + $1 WHERE id = $2`, [diff, old.fund_source_id]);
            }
        }
        return this.txRepo.findOne({ where: { id } });
    }
    async deleteTransaction(id) {
        const tx = await this.txRepo.findOne({ where: { id } });
        await this.txRepo.delete(id);
        if (tx) {
            await this.dataSource.query(`UPDATE fund_sources SET received_so_far = GREATEST(0, received_so_far - $1) WHERE id = $2`, [tx.amount, tx.fund_source_id]);
        }
        return { deleted: true };
    }
};
exports.FundsService = FundsService;
exports.FundsService = FundsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(fund_source_entity_1.FundSource)),
    __param(1, (0, typeorm_1.InjectRepository)(fund_transaction_entity_1.FundTransaction)),
    __param(2, (0, typeorm_2.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_3.Repository,
        typeorm_3.Repository,
        typeorm_3.DataSource])
], FundsService);
//# sourceMappingURL=funds.service.js.map