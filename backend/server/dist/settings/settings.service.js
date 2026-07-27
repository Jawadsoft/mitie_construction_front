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
exports.SettingsService = exports.PAKISTAN_MARLA_SQFT = exports.GAZZ_SQFT = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const app_setting_entity_1 = require("./entities/app-setting.entity");
exports.GAZZ_SQFT = 9;
exports.PAKISTAN_MARLA_SQFT = 272.25;
const KEY_STANDARD = 'measurement.standard';
const KEY_MARLA_SQFT = 'measurement.marla_sqft';
let SettingsService = class SettingsService {
    settingsRepo;
    constructor(settingsRepo) {
        this.settingsRepo = settingsRepo;
    }
    async getRaw(key) {
        const row = await this.settingsRepo.findOne({ where: { key } });
        return row?.value;
    }
    async setRaw(key, value) {
        await this.settingsRepo.save({ key, value });
    }
    async getMeasurement() {
        const standardRaw = await this.getRaw(KEY_STANDARD);
        const marlaRaw = await this.getRaw(KEY_MARLA_SQFT);
        let standard = standardRaw === 'CUSTOM' || standardRaw === 'PAKISTAN'
            ? standardRaw
            : 'PAKISTAN';
        let marla_sqft = typeof marlaRaw === 'number' && marlaRaw > 0
            ? marlaRaw
            : typeof marlaRaw === 'string' && Number(marlaRaw) > 0
                ? Number(marlaRaw)
                : exports.PAKISTAN_MARLA_SQFT;
        if (standard === 'PAKISTAN') {
            marla_sqft = exports.PAKISTAN_MARLA_SQFT;
        }
        return {
            standard,
            marla_sqft,
            gazz_sqft: exports.GAZZ_SQFT,
        };
    }
    async updateMeasurement(body) {
        const current = await this.getMeasurement();
        const standard = body.standard ?? current.standard;
        if (standard !== 'PAKISTAN' && standard !== 'CUSTOM') {
            throw new common_1.BadRequestException('standard must be PAKISTAN or CUSTOM');
        }
        let marla_sqft;
        if (standard === 'PAKISTAN') {
            marla_sqft = exports.PAKISTAN_MARLA_SQFT;
        }
        else {
            const raw = body.marla_sqft ?? current.marla_sqft;
            marla_sqft = Number(raw);
            if (!Number.isFinite(marla_sqft) || marla_sqft <= 0) {
                throw new common_1.BadRequestException('marla_sqft must be a positive number for CUSTOM standard');
            }
        }
        await this.setRaw(KEY_STANDARD, standard);
        await this.setRaw(KEY_MARLA_SQFT, marla_sqft);
        return {
            standard,
            marla_sqft,
            gazz_sqft: exports.GAZZ_SQFT,
        };
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(app_setting_entity_1.AppSetting)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SettingsService);
//# sourceMappingURL=settings.service.js.map