import { Controller, Get, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';

// Internal-only view of what the app "would have sent" — see
// NotificationsService for why this is log/queue-only, not a real send.
@Controller('api/v1/email-logs')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin', 'manager')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list() {
    return this.notificationsService.list();
  }
}
