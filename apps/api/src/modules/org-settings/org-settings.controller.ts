import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OrgSettingsService } from './org-settings.service';
import { UpdateOrgSettingsDto } from './dto/org-settings.dto';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';

// GET is open to any authenticated session — org name/logo/footer are read
// broadly (quotation PDF rendering, the app shell, etc.), not sensitive.
// PATCH is admin-only: unlike catalog items, org identity/branding is a
// single shared setting affecting every client-facing document, so it gets
// a narrower write gate than CatalogController's admin+manager.
@Controller('api/v1/org-settings')
@UseGuards(SessionAuthGuard, RolesGuard)
export class OrgSettingsController {
  constructor(private readonly orgSettingsService: OrgSettingsService) {}

  @Get()
  get() {
    return this.orgSettingsService.get();
  }

  @Patch()
  @Roles('admin')
  update(@Body() dto: UpdateOrgSettingsDto, @Req() req: Request) {
    return this.orgSettingsService.update(dto, req.session.userId ?? null);
  }
}
