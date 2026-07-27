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
exports.LandService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const land_parcel_entity_1 = require("./entities/land-parcel.entity");
let LandService = class LandService {
    parcelRepo;
    constructor(parcelRepo) {
        this.parcelRepo = parcelRepo;
    }
    findAll(project_id) {
        const q = this.parcelRepo.createQueryBuilder('p').orderBy('p.created_at', 'DESC');
        if (project_id)
            q.andWhere('p.project_id = :pid', { pid: project_id });
        return q.getMany();
    }
    async findOne(id) {
        const parcel = await this.parcelRepo.findOne({ where: { id } });
        if (!parcel)
            throw new common_1.NotFoundException('Land parcel not found');
        return parcel;
    }
    create(dto) {
        return this.parcelRepo.save(this.parcelRepo.create(dto));
    }
    async update(id, dto) {
        await this.findOne(id);
        await this.parcelRepo.update(id, dto);
        return this.findOne(id);
    }
    async remove(id) {
        await this.findOne(id);
        await this.parcelRepo.delete(id);
        return { deleted: true };
    }
};
exports.LandService = LandService;
exports.LandService = LandService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(land_parcel_entity_1.LandParcel)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], LandService);
//# sourceMappingURL=land.service.js.map