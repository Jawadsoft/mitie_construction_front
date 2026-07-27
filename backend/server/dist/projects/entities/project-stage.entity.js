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
exports.ProjectStage = void 0;
const typeorm_1 = require("typeorm");
const project_entity_1 = require("./project.entity");
const stage_budget_entity_1 = require("./stage-budget.entity");
const stage_progress_entity_1 = require("./stage-progress.entity");
let ProjectStage = class ProjectStage {
    id;
    project_id;
    name;
    description;
    sequence_order;
    start_date;
    end_date;
    completion_percent;
    status;
    created_at;
    updated_at;
    project;
    budget;
    progressLogs;
};
exports.ProjectStage = ProjectStage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], ProjectStage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], ProjectStage.prototype, "project_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], ProjectStage.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], ProjectStage.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ProjectStage.prototype, "sequence_order", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Object)
], ProjectStage.prototype, "start_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Object)
], ProjectStage.prototype, "end_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: '0.00' }),
    __metadata("design:type", String)
], ProjectStage.prototype, "completion_percent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'Planned' }),
    __metadata("design:type", String)
], ProjectStage.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], ProjectStage.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    }),
    __metadata("design:type", Date)
], ProjectStage.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, (project) => project.stages),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], ProjectStage.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => stage_budget_entity_1.StageBudget, (budget) => budget.stage),
    __metadata("design:type", stage_budget_entity_1.StageBudget)
], ProjectStage.prototype, "budget", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => stage_progress_entity_1.StageProgress, (progress) => progress.stage),
    __metadata("design:type", Array)
], ProjectStage.prototype, "progressLogs", void 0);
exports.ProjectStage = ProjectStage = __decorate([
    (0, typeorm_1.Entity)('project_stages')
], ProjectStage);
//# sourceMappingURL=project-stage.entity.js.map