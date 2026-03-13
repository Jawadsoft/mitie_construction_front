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
exports.StageProgress = void 0;
const typeorm_1 = require("typeorm");
const project_stage_entity_1 = require("./project-stage.entity");
let StageProgress = class StageProgress {
    id;
    project_stage_id;
    report_date;
    completion_percent;
    notes;
    has_delay;
    created_at;
    stage;
};
exports.StageProgress = StageProgress;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], StageProgress.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', unsigned: true }),
    __metadata("design:type", String)
], StageProgress.prototype, "project_stage_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], StageProgress.prototype, "report_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", String)
], StageProgress.prototype, "completion_percent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], StageProgress.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], StageProgress.prototype, "has_delay", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], StageProgress.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_stage_entity_1.ProjectStage, (stage) => stage.progressLogs),
    (0, typeorm_1.JoinColumn)({ name: 'project_stage_id' }),
    __metadata("design:type", project_stage_entity_1.ProjectStage)
], StageProgress.prototype, "stage", void 0);
exports.StageProgress = StageProgress = __decorate([
    (0, typeorm_1.Entity)('stage_progress')
], StageProgress);
//# sourceMappingURL=stage-progress.entity.js.map