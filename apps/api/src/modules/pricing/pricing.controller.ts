import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PricingService } from './pricing.service';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import { CreatePricingProfileDto, UpdatePricingProfileDto } from './dto/pricing-profile.dto';
import { CreatePricingRuleDto, UpdatePricingRuleDto } from './dto/pricing-rule.dto';

@Controller('api/v1')
@UseGuards(SessionAuthGuard, RolesGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('pricing-profiles')
  listProfiles() {
    return this.pricingService.listProfiles();
  }

  @Get('pricing-profiles/:id')
  getProfile(@Param('id') id: string) {
    return this.pricingService.getProfile(id);
  }

  @Post('pricing-profiles')
  @Roles('admin', 'manager')
  createProfile(@Body() dto: CreatePricingProfileDto, @Req() req: Request) {
    return this.pricingService.createProfile(dto, req.session.userId ?? null);
  }

  @Patch('pricing-profiles/:id')
  @Roles('admin', 'manager')
  updateProfile(@Param('id') id: string, @Body() dto: UpdatePricingProfileDto, @Req() req: Request) {
    return this.pricingService.updateProfile(id, dto, req.session.userId ?? null);
  }

  @Delete('pricing-profiles/:id')
  @Roles('admin')
  deleteProfile(@Param('id') id: string, @Req() req: Request) {
    return this.pricingService.deleteProfile(id, req.session.userId ?? null);
  }

  @Get('pricing-profiles/:id/rules')
  listRules(@Param('id') id: string) {
    return this.pricingService.listRulesForProfile(id);
  }

  @Post('pricing-rules')
  @Roles('admin', 'manager')
  createRule(@Body() dto: CreatePricingRuleDto, @Req() req: Request) {
    return this.pricingService.createRule(dto, req.session.userId ?? null);
  }

  @Patch('pricing-rules/:id')
  @Roles('admin', 'manager')
  updateRule(@Param('id') id: string, @Body() dto: UpdatePricingRuleDto, @Req() req: Request) {
    return this.pricingService.updateRule(id, dto, req.session.userId ?? null);
  }

  @Delete('pricing-rules/:id')
  @Roles('admin')
  deleteRule(@Param('id') id: string, @Req() req: Request) {
    return this.pricingService.deleteRule(id, req.session.userId ?? null);
  }
}
