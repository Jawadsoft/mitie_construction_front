"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcurementModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const purchase_order_entity_1 = require("./entities/purchase-order.entity");
const po_item_entity_1 = require("./entities/po-item.entity");
const material_receipt_entity_1 = require("./entities/material-receipt.entity");
const procurement_service_1 = require("./procurement.service");
const procurement_controller_1 = require("./procurement.controller");
let ProcurementModule = class ProcurementModule {
};
exports.ProcurementModule = ProcurementModule;
exports.ProcurementModule = ProcurementModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([purchase_order_entity_1.PurchaseOrder, po_item_entity_1.PoItem, material_receipt_entity_1.MaterialReceipt])],
        controllers: [procurement_controller_1.ProcurementController],
        providers: [procurement_service_1.ProcurementService],
        exports: [procurement_service_1.ProcurementService, typeorm_1.TypeOrmModule],
    })
], ProcurementModule);
//# sourceMappingURL=procurement.module.js.map