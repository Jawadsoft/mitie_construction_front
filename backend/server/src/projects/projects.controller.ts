import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateStageDto } from './dto/create-stage.dto';

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateProjectDto>) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Get(':id/stages')
  getStages(@Param('id') id: string) {
    return this.projectsService.findStages(id);
  }

  @Post(':id/stages')
  createStage(@Param('id') id: string, @Body() dto: CreateStageDto) {
    return this.projectsService.createStage(id, dto);
  }

  @Patch('stages/:stageId')
  updateStage(
    @Param('stageId') stageId: string,
    @Body() dto: Partial<CreateStageDto>,
  ) {
    return this.projectsService.updateStage(stageId, dto);
  }
}
