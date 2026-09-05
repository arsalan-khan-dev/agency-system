import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ChangeRequestService } from './change-request.service';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import { CreateChangeRequestDto } from './dto/change-request.dto';

@Controller('api/v1/change-requests')
@UseGuards(SessionAuthGuard, RolesGuard)
export class ChangeRequestController {
  constructor(private readonly changeRequestService: ChangeRequestService) {}

  @Get()
  list(@Query('projectId') projectId?: string) {
    return this.changeRequestService.list(projectId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.changeRequestService.get(id);
  }

  @Post()
  @Roles('admin', 'manager', 'estimator')
  create(@Body() dto: CreateChangeRequestDto, @Req() req: Request) {
    return this.changeRequestService.create(dto, req.session.userId ?? null);
  }

  // Approval/rejection carries direct budget impact — restricted to
  // admin/manager only, same rationale as ProjectController.logExpense.
  @Patch(':id/approve')
  @Roles('admin', 'manager')
  approve(@Param('id') id: string, @Req() req: Request) {
    return this.changeRequestService.approve(id, req.session.userId ?? null);
  }

  @Patch(':id/reject')
  @Roles('admin', 'manager')
  reject(@Param('id') id: string, @Req() req: Request) {
    return this.changeRequestService.reject(id, req.session.userId ?? null);
  }
}
