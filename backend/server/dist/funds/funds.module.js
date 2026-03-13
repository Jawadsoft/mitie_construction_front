"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FundsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const fund_source_entity_1 = require("./entities/fund-source.entity");
const fund_transaction_entity_1 = require("./entities/fund-transaction.entity");
const funds_service_1 = require("./funds.service");
const funds_controller_1 = require("./funds.controller");
let FundsModule = class FundsModule {
};
exports.FundsModule = FundsModule;
exports.FundsModule = FundsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([fund_source_entity_1.FundSource, fund_transaction_entity_1.FundTransaction])],
        controllers: [funds_controller_1.FundsController],
        providers: [funds_service_1.FundsService],
        exports: [funds_service_1.FundsService, typeorm_1.TypeOrmModule],
    })
], FundsModule);
//# sourceMappingURL=funds.module.js.map