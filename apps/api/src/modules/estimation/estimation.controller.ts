import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { EstimationService } from './estimation.service';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import { CreateEstimationQuestionDto, UpdateEstimationQuestionDto } from './dto/estimation-question.dto';
import { CreateEstimateDto, AdjustEstimatePriceDto } from './dto/estimate.dto';

@Controller('api/v1')
@UseGuards(SessionAuthGuard, RolesGuard)
export class EstimationController {
  constructor(private readonly estimationService: EstimationService) {}

  // ---- Estimation Questions ----
  @Get('estimation-questions')
  listQuestions(@Query('projectTypeId') projectTypeId?: string) {
    return this.estimationService.listQuestions(projectTypeId);
  }

  @Post('estimation-questions')
  @Roles('admin', 'manager')
  createQuestion(@Body() dto: CreateEstimationQuestionDto, @Req() req: Request) {
    return this.estimationService.createQuestion(dto, req.session.userId ?? null);
  }

  @Patch('estimation-questions/:id')
  @Roles('admin', 'manager')
  updateQuestion(@Param('id') id: string, @Body() dto: UpdateEstimationQuestionDto, @Req() req: Request) {
    return this.estimationService.updateQuestion(id, dto, req.session.userId ?? null);
  }

  @Delete('estimation-questions/:id')
  @Roles('admin')
  deleteQuestion(@Param('id') id: string, @Req() req: Request) {
    return this.estimationService.deleteQuestion(id, req.session.userId ?? null);
  }

  // ---- Estimates ----
  @Get('estimates')
  listEstimates() {
    return this.estimationService.listEstimates();
  }

  @Get('estimates/:id')
  getEstimate(@Param('id') id: string) {
    return this.estimationService.getEstimate(id);
  }

  @Post('estimates')
  @Roles('admin', 'manager', 'estimator')
  createEstimate(@Body() dto: CreateEstimateDto, @Req() req: Request) {
    return this.estimationService.createEstimate(dto, req.session.userId ?? null);
  }

  @Patch('estimates/:id/price')
  @Roles('admin', 'manager', 'estimator')
  adjustPrice(@Param('id') id: string, @Body() dto: AdjustEstimatePriceDto, @Req() req: Request) {
    return this.estimationService.adjustPrice(id, dto, req.session.userId ?? null);
  }

  @Patch('estimates/:id/price/clear')
  @Roles('admin', 'manager', 'estimator')
  clearAdjustment(@Param('id') id: string, @Req() req: Request) {
    return this.estimationService.clearAdjustment(id, req.session.userId ?? null);
  }

  @Patch('estimates/:id/finalize')
  @Roles('admin', 'manager', 'estimator')
  finalizeEstimate(@Param('id') id: string, @Req() req: Request) {
    return this.estimationService.finalizeEstimate(id, req.session.userId ?? null);
  }
}
