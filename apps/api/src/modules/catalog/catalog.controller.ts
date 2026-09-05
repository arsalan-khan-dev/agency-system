import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CatalogService } from './catalog.service';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import { CreateServiceCategoryDto, UpdateServiceCategoryDto } from './dto/service-category.dto';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { CreateProjectTypeDto, UpdateProjectTypeDto } from './dto/project-type.dto';
import { CreateFeatureDto, UpdateFeatureDto } from './dto/feature.dto';

// All catalog routes require an authenticated session. Writes are additionally
// restricted to admin/manager. See MEMORY.md Section 13 (Security) + Section 04.
@Controller('api/v1')
@UseGuards(SessionAuthGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // ---- Service Categories ----
  @Get('service-categories')
  listCategories() {
    return this.catalogService.listCategories();
  }

  @Get('service-categories/:id')
  getCategory(@Param('id') id: string) {
    return this.catalogService.getCategory(id);
  }

  @Post('service-categories')
  @Roles('admin', 'manager')
  createCategory(@Body() dto: CreateServiceCategoryDto, @Req() req: Request) {
    return this.catalogService.createCategory(dto, req.session.userId ?? null);
  }

  @Patch('service-categories/:id')
  @Roles('admin', 'manager')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateServiceCategoryDto, @Req() req: Request) {
    return this.catalogService.updateCategory(id, dto, req.session.userId ?? null);
  }

  @Delete('service-categories/:id')
  @Roles('admin')
  deleteCategory(@Param('id') id: string, @Req() req: Request) {
    return this.catalogService.deleteCategory(id, req.session.userId ?? null);
  }

  // ---- Services ----
  @Get('services')
  listServices() {
    return this.catalogService.listServices();
  }

  @Get('services/:id')
  getService(@Param('id') id: string) {
    return this.catalogService.getService(id);
  }

  @Post('services')
  @Roles('admin', 'manager')
  createService(@Body() dto: CreateServiceDto, @Req() req: Request) {
    return this.catalogService.createService(dto, req.session.userId ?? null);
  }

  @Patch('services/:id')
  @Roles('admin', 'manager')
  updateService(@Param('id') id: string, @Body() dto: UpdateServiceDto, @Req() req: Request) {
    return this.catalogService.updateService(id, dto, req.session.userId ?? null);
  }

  @Delete('services/:id')
  @Roles('admin')
  deleteService(@Param('id') id: string, @Req() req: Request) {
    return this.catalogService.deleteService(id, req.session.userId ?? null);
  }

  // ---- Project Types ----
  @Get('project-types')
  listProjectTypes() {
    return this.catalogService.listProjectTypes();
  }

  @Get('project-types/:id')
  getProjectType(@Param('id') id: string) {
    return this.catalogService.getProjectType(id);
  }

  @Post('project-types')
  @Roles('admin', 'manager')
  createProjectType(@Body() dto: CreateProjectTypeDto, @Req() req: Request) {
    return this.catalogService.createProjectType(dto, req.session.userId ?? null);
  }

  @Patch('project-types/:id')
  @Roles('admin', 'manager')
  updateProjectType(@Param('id') id: string, @Body() dto: UpdateProjectTypeDto, @Req() req: Request) {
    return this.catalogService.updateProjectType(id, dto, req.session.userId ?? null);
  }

  @Delete('project-types/:id')
  @Roles('admin')
  deleteProjectType(@Param('id') id: string, @Req() req: Request) {
    return this.catalogService.deleteProjectType(id, req.session.userId ?? null);
  }

  // ---- Features ----
  @Get('features')
  listFeatures() {
    return this.catalogService.listFeatures();
  }

  @Get('features/:id')
  getFeature(@Param('id') id: string) {
    return this.catalogService.getFeature(id);
  }

  @Post('features')
  @Roles('admin', 'manager')
  createFeature(@Body() dto: CreateFeatureDto, @Req() req: Request) {
    return this.catalogService.createFeature(dto, req.session.userId ?? null);
  }

  @Patch('features/:id')
  @Roles('admin', 'manager')
  updateFeature(@Param('id') id: string, @Body() dto: UpdateFeatureDto, @Req() req: Request) {
    return this.catalogService.updateFeature(id, dto, req.session.userId ?? null);
  }

  @Delete('features/:id')
  @Roles('admin')
  deleteFeature(@Param('id') id: string, @Req() req: Request) {
    return this.catalogService.deleteFeature(id, req.session.userId ?? null);
  }
}
