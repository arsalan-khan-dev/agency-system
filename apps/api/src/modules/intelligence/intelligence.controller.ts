import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';

@Controller('api/v1/intelligence')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin', 'manager', 'estimator')
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get('accuracy-trend')
  getAccuracyTrend() {
    return this.intelligenceService.getAccuracyTrend();
  }

  @Get('accuracy-by-project-type')
  getAccuracyByProjectType() {
    return this.intelligenceService.getAccuracyByProjectType();
  }

  /**
   * GET /api/v1/intelligence/similar-estimates?projectTypeId=...&featureIds=id1,id2,id3
   * Structured Jaccard-overlap similarity within the same project type —
   * see IntelligenceService.findSimilarEstimates for the "no AI" rationale.
   */
  @Get('similar-estimates')
  findSimilarEstimates(@Query('projectTypeId') projectTypeId: string, @Query('featureIds') featureIds: string) {
    if (!projectTypeId) {
      throw new BadRequestException('projectTypeId query param is required');
    }
    const ids = (featureIds ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      throw new BadRequestException('featureIds query param is required (comma-separated UUIDs)');
    }
    return this.intelligenceService.findSimilarEstimates(projectTypeId, ids);
  }
}
