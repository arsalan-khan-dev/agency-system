import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCategory } from './entities/service-category.entity';
import { Service } from './entities/service.entity';
import { ProjectType } from './entities/project-type.entity';
import { Feature } from './entities/feature.entity';
import { CreateServiceCategoryDto, UpdateServiceCategoryDto } from './dto/service-category.dto';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { CreateProjectTypeDto, UpdateProjectTypeDto } from './dto/project-type.dto';
import { CreateFeatureDto, UpdateFeatureDto } from './dto/feature.dto';
import { AuditLogService } from '../identity/audit-log.service';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(ServiceCategory) private categoryRepo: Repository<ServiceCategory>,
    @InjectRepository(Service) private serviceRepo: Repository<Service>,
    @InjectRepository(ProjectType) private projectTypeRepo: Repository<ProjectType>,
    @InjectRepository(Feature) private featureRepo: Repository<Feature>,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ---------- Service Categories ----------
  listCategories() {
    return this.categoryRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async getCategory(id: string) {
    const category = await this.categoryRepo.findOne({ where: { id }, relations: ['services'] });
    if (!category) throw new NotFoundException('Service category not found');
    return category;
  }

  async createCategory(dto: CreateServiceCategoryDto, actingUserId: string | null = null) {
    const category = await this.categoryRepo.save(this.categoryRepo.create(dto));
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'catalog.service_category.created',
      entityType: 'ServiceCategory',
      entityId: category.id,
      metadata: { name: category.name },
    });
    return category;
  }

  async updateCategory(id: string, dto: UpdateServiceCategoryDto, actingUserId: string | null = null) {
    const category = await this.getCategory(id);
    Object.assign(category, dto);
    const saved = await this.categoryRepo.save(category);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'catalog.service_category.updated',
      entityType: 'ServiceCategory',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });
    return saved;
  }

  async deleteCategory(id: string, actingUserId: string | null = null) {
    const category = await this.getCategory(id);
    await this.categoryRepo.softRemove(category); // soft delete only — see business rules
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'catalog.service_category.deleted',
      entityType: 'ServiceCategory',
      entityId: id,
    });
    return { success: true };
  }

  // ---------- Services ----------
  listServices() {
    return this.serviceRepo.find({ relations: ['category'], order: { name: 'ASC' } });
  }

  async getService(id: string) {
    const service = await this.serviceRepo.findOne({ where: { id }, relations: ['category'] });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async createService(dto: CreateServiceDto, actingUserId: string | null = null) {
    const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Service category not found');
    const service = await this.serviceRepo.save(
      this.serviceRepo.create({
        name: dto.name,
        description: dto.description ?? null,
        baseUnitCostCents: dto.baseUnitCostCents,
        unit: dto.unit ?? 'hour',
        category,
      }),
    );
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'catalog.service.created',
      entityType: 'Service',
      entityId: service.id,
      metadata: { name: service.name },
    });
    return service;
  }

  async updateService(id: string, dto: UpdateServiceDto, actingUserId: string | null = null) {
    const service = await this.getService(id);
    if (dto.categoryId) {
      const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException('Service category not found');
      service.category = category;
    }
    Object.assign(service, {
      name: dto.name ?? service.name,
      description: dto.description ?? service.description,
      baseUnitCostCents: dto.baseUnitCostCents ?? service.baseUnitCostCents,
      unit: dto.unit ?? service.unit,
      isActive: dto.isActive ?? service.isActive,
    });
    const saved = await this.serviceRepo.save(service);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'catalog.service.updated',
      entityType: 'Service',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });
    return saved;
  }

  async deleteService(id: string, actingUserId: string | null = null) {
    const service = await this.getService(id);
    await this.serviceRepo.softRemove(service);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'catalog.service.deleted',
      entityType: 'Service',
      entityId: id,
    });
    return { success: true };
  }

  // ---------- Project Types ----------
  listProjectTypes() {
    return this.projectTypeRepo.find({ order: { name: 'ASC' } });
  }

  async getProjectType(id: string) {
    const projectType = await this.projectTypeRepo.findOne({ where: { id }, relations: ['features'] });
    if (!projectType) throw new NotFoundException('Project type not found');
    return projectType;
  }

  async createProjectType(dto: CreateProjectTypeDto, actingUserId: string | null = null) {
    const projectType = await this.projectTypeRepo.save(this.projectTypeRepo.create(dto));
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'catalog.project_type.created',
      entityType: 'ProjectType',
      entityId: projectType.id,
      metadata: { name: projectType.name },
    });
    return projectType;
  }

  async updateProjectType(id: string, dto: UpdateProjectTypeDto, actingUserId: string | null = null) {
    const projectType = await this.getProjectType(id);
    Object.assign(projectType, dto);
    const saved = await this.projectTypeRepo.save(projectType);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'catalog.project_type.updated',
      entityType: 'ProjectType',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });
    return saved;
  }

  async deleteProjectType(id: string, actingUserId: string | null = null) {
    const projectType = await this.getProjectType(id);
    await this.projectTypeRepo.softRemove(projectType);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'catalog.project_type.deleted',
      entityType: 'ProjectType',
      entityId: id,
    });
    return { success: true };
  }

  // ---------- Features ----------
  listFeatures() {
    return this.featureRepo.find({ relations: ['projectType'], order: { name: 'ASC' } });
  }

  async getFeature(id: string) {
    const feature = await this.featureRepo.findOne({ where: { id }, relations: ['projectType'] });
    if (!feature) throw new NotFoundException('Feature not found');
    return feature;
  }

  async createFeature(dto: CreateFeatureDto, actingUserId: string | null = null) {
    const projectType = await this.projectTypeRepo.findOne({ where: { id: dto.projectTypeId } });
    if (!projectType) throw new NotFoundException('Project type not found');
    const feature = await this.featureRepo.save(
      this.featureRepo.create({
        name: dto.name,
        description: dto.description ?? null,
        baselineHours: String(dto.baselineHours ?? 0),
        projectType,
      }),
    );
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'catalog.feature.created',
      entityType: 'Feature',
      entityId: feature.id,
      metadata: { name: feature.name, projectTypeId: projectType.id },
    });
    return feature;
  }

  async updateFeature(id: string, dto: UpdateFeatureDto, actingUserId: string | null = null) {
    const feature = await this.getFeature(id);
    if (dto.projectTypeId) {
      const projectType = await this.projectTypeRepo.findOne({ where: { id: dto.projectTypeId } });
      if (!projectType) throw new NotFoundException('Project type not found');
      feature.projectType = projectType;
    }
    Object.assign(feature, {
      name: dto.name ?? feature.name,
      description: dto.description ?? feature.description,
      baselineHours: dto.baselineHours !== undefined ? String(dto.baselineHours) : feature.baselineHours,
      isActive: dto.isActive ?? feature.isActive,
    });
    const saved = await this.featureRepo.save(feature);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'catalog.feature.updated',
      entityType: 'Feature',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });
    return saved;
  }

  async deleteFeature(id: string, actingUserId: string | null = null) {
    const feature = await this.getFeature(id);
    await this.featureRepo.softRemove(feature);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'catalog.feature.deleted',
      entityType: 'Feature',
      entityId: id,
    });
    return { success: true };
  }
}
