import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ProjectService } from './project.service';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import { CreateProjectFromQuotationDto, UpdateProjectStatusDto } from './dto/project.dto';
import { LogActualDto, LogExpenseDto } from './dto/actual-expense.dto';

@Controller('api/v1/projects')
@UseGuards(SessionAuthGuard, RolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  list() {
    return this.projectService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.projectService.get(id);
  }

  @Get(':id/profitability')
  getProfitability(@Param('id') id: string) {
    return this.projectService.getProfitability(id);
  }

  @Post('from-quotation')
  @Roles('admin', 'manager', 'estimator')
  createFromQuotation(@Body() dto: CreateProjectFromQuotationDto) {
    return this.projectService.createFromQuotation(dto);
  }

  @Patch(':id/status')
  @Roles('admin', 'manager', 'estimator')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateProjectStatusDto) {
    return this.projectService.updateStatus(id, dto);
  }

  @Post(':id/actuals')
  @Roles('admin', 'manager', 'estimator')
  logActual(@Param('id') id: string, @Body() dto: LogActualDto, @Req() req: Request) {
    return this.projectService.logActual(id, dto, req.session.userId ?? null);
  }

  // Expense logging is financial data — restricted to admin/manager only,
  // unlike actuals which estimators can also log. See MEMORY.md Section 13.
  @Post(':id/expenses')
  @Roles('admin', 'manager')
  logExpense(@Param('id') id: string, @Body() dto: LogExpenseDto, @Req() req: Request) {
    return this.projectService.logExpense(id, dto, req.session.userId ?? null);
  }
}
