"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const project_entity_1 = require("../projects/entities/project.entity");
const land_parcel_entity_1 = require("../land/entities/land-parcel.entity");
const customer_entity_1 = require("../sales/entities/customer.entity");
const sale_entity_1 = require("../sales/entities/sale.entity");
const expense_entity_1 = require("../expenses/entities/expense.entity");
const supplier_entity_1 = require("../suppliers/entities/supplier.entity");
const search_service_1 = require("./search.service");
const search_controller_1 = require("./search.controller");
const auth_module_1 = require("../auth/auth.module");
let SearchModule = class SearchModule {
};
exports.SearchModule = SearchModule;
exports.SearchModule = SearchModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([project_entity_1.Project, land_parcel_entity_1.LandParcel, customer_entity_1.Customer, sale_entity_1.Sale, expense_entity_1.Expense, supplier_entity_1.Supplier]),
            auth_module_1.AuthModule,
        ],
        controllers: [search_controller_1.SearchController],
        providers: [search_service_1.SearchService],
    })
], SearchModule);
//# sourceMappingURL=search.module.js.map