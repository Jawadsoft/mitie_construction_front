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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StageBudget = void 0;
const typeorm_1 = require("typeorm");
const project_stage_entity_1 = require("./project-stage.entity");
let StageBudget = class StageBudget {
    id;
    project_stage_id;
    labour_budget;
    material_budget;
    equipment_budget;
    other_budget;
    total_budget;
    created_at;
    updated_at;
    stage;
};
exports.StageBudget = StageBudget;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], StageBudget.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], StageBudget.prototype, "project_stage_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2, default: '0.00' }),
    __metadata("design:type", String)
], StageBudget.prototype, "labour_budget", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2, default: '0.00' }),
    __metadata("design:type", String)
], StageBudget.prototype, "material_budget", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2, default: '0.00' }),
    __metadata("design:type", String)
], StageBudget.prototype, "equipment_budget", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2, default: '0.00' }),
    __metadata("design:type", String)
], StageBudget.prototype, "other_budget", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 2, default: '0.00' }),
    __metadata("design:type", String)
], StageBudget.prototype, "total_budget", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], StageBudget.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], StageBudget.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => project_stage_entity_1.ProjectStage, (stage) => stage.budget),
    (0, typeorm_1.JoinColumn)({ name: 'project_stage_id' }),
    __metadata("design:type", project_stage_entity_1.ProjectStage)
], StageBudget.prototype, "stage", void 0);
exports.StageBudget = StageBudget = __decorate([
    (0, typeorm_1.Entity)('stage_budgets')
], StageBudget);
//# sourceMappingURL=stage-budget.entity.js.map