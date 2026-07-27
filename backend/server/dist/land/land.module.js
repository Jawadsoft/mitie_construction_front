"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LandModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const land_parcel_entity_1 = require("./entities/land-parcel.entity");
const land_service_1 = require("./land.service");
const land_controller_1 = require("./land.controller");
let LandModule = class LandModule {
};
exports.LandModule = LandModule;
exports.LandModule = LandModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([land_parcel_entity_1.LandParcel])],
        controllers: [land_controller_1.LandController],
        providers: [land_service_1.LandService],
        exports: [land_service_1.LandService, typeorm_1.TypeOrmModule],
    })
], LandModule);
//# sourceMappingURL=land.module.js.map