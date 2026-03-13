import { DataSource, Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectStage } from './entities/project-stage.entity';
import { StageBudget } from './entities/stage-budget.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateStageDto } from './dto/create-stage.dto';
export declare class ProjectsService {
    private readonly projectsRepo;
    private readonly stagesRepo;
    private readonly stageBudgetsRepo;
    private readonly dataSource;
    constructor(projectsRepo: Repository<Project>, stagesRepo: Repository<ProjectStage>, stageBudgetsRepo: Repository<StageBudget>, dataSource: DataSource);
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
        stages: ProjectStage[];
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
        stages: ProjectStage[];
    }>;
    create(dto: CreateProjectDto): Promise<Project>;
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
        stages: ProjectStage[];
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    findStages(projectId: string): Promise<ProjectStage[]>;
    createStage(projectId: string, dto: CreateStageDto): Promise<ProjectStage | null>;
    updateStage(stageId: string, dto: Partial<CreateStageDto>): Promise<ProjectStage | null>;
    private enrichProject;
}
