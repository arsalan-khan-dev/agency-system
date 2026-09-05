import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';

@Controller('api/v1/reports')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin', 'manager', 'estimator')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('conversion-funnel')
  getConversionFunnel() {
    return this.reportsService.getConversionFunnel();
  }

  @Get('revenue-by-project-type')
  getRevenueByProjectType() {
    return this.reportsService.getRevenueByProjectType();
  }

  @Get('estimated-vs-actual-hours')
  getEstimatedVsActualHours() {
    return this.reportsService.getEstimatedVsActualHours();
  }

  @Get('profitability-comparison')
  getProfitabilityComparison() {
    return this.reportsService.getProfitabilityComparison();
  }
}
