import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateStageDto } from './dto/create-stage.dto';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    findAll(): Promise<{
        computed: {
            total_stage_budget: number;
            avg_completion_percent: number;
            stage_count: number;
        };
        id: string;
        name: string;
        location: string | null;
        plot_size: string | null;
        start_date: string | null;
        expected_completion_date: string | null;
        project_type: string | null;
        total_estimated_budget: string | null;
        status: string;
        created_at: Date;
        updated_at: Date;
        stages: import("./entities/project-stage.entity").ProjectStage[];
    }[]>;
    findOne(id: string): Promise<{
        computed: {
            total_stage_budget: number;
            avg_completion_percent: number;
            stage_count: number;
        };
        id: string;
        name: string;
        location: string | null;
        plot_size: string | null;
        start_date: string | null;
        expected_completion_date: string | null;
        project_type: string | null;
        total_estimated_budget: string | null;
        status: string;
        created_at: Date;
        updated_at: Date;
        stages: import("./entities/project-stage.entity").ProjectStage[];
    }>;
    create(dto: CreateProjectDto): Promise<import("./entities/project.entity").Project>;
    update(id: string, dto: Partial<CreateProjectDto>): Promise<{
        computed: {
            total_stage_budget: number;
            avg_completion_percent: number;
            stage_count: number;
        };
        id: string;
        name: string;
        location: string | null;
        plot_size: string | null;
        start_date: string | null;
        expected_completion_date: string | null;
        project_type: string | null;
        total_estimated_budget: string | null;
        status: string;
        created_at: Date;
        updated_at: Date;
        stages: import("./entities/project-stage.entity").ProjectStage[];
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    getStages(id: string): Promise<import("./entities/project-stage.entity").ProjectStage[]>;
    createStage(id: string, dto: CreateStageDto): Promise<import("./entities/project-stage.entity").ProjectStage | null>;
    updateStage(stageId: string, dto: Partial<CreateStageDto>): Promise<import("./entities/project-stage.entity").ProjectStage | null>;
}
