import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { SellDuringConstructionDto } from './dto/sell-during-construction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@Query('lifecycle') lifecycle?: string) {
    const lc =
      lifecycle === 'archived' || lifecycle === 'deleted' ? lifecycle : 'active';
    return this.projectsService.findAll(lc);
  }

  @Get(':id/activity')
  getActivity(@Param('id') id: string) {
    return this.projectsService.getActivityLog(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateProjectDto, @Req() req: { user?: { userId?: string } }) {
    return this.projectsService.create(dto, req.user?.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProjectDto>,
    @Req() req: { user?: { userId?: string } },
  ) {
    return this.projectsService.update(id, dto, req.user?.userId);
  }

  @Post(':id/sell-during-construction')
  sellDuringConstruction(
    @Param('id') id: string,
    @Body() dto: SellDuringConstructionDto,
  ) {
    return this.projectsService.sellDuringConstruction(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  restore(@Param('id') id: string) {
    return this.projectsService.restore(id);
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
