import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ChangeRequest } from './entities/change-request.entity';
import { Project } from '../project/entities/project.entity';
import { CreateChangeRequestDto } from './dto/change-request.dto';
import { AuditLogService } from '../identity/audit-log.service';
import { QuotationService } from '../quotation/quotation.service';

@Injectable()
export class ChangeRequestService {
  constructor(
    @InjectRepository(ChangeRequest) private changeRequestRepo: Repository<ChangeRequest>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    private readonly auditLogService: AuditLogService,
    private readonly quotationService: QuotationService,
    private readonly dataSource: DataSource,
  ) {}

  list(projectId?: string) {
    return this.changeRequestRepo.find({
      where: projectId ? { project: { id: projectId } } : {},
      relations: ['project', 'requestedBy', 'resolvedBy', 'resultingQuotation'],
      order: { createdAt: 'DESC' },
    });
  }

  async get(id: string) {
    const changeRequest = await this.changeRequestRepo.findOne({
      where: { id },
      relations: ['project', 'requestedBy', 'resolvedBy', 'resultingQuotation'],
    });
    if (!changeRequest) throw new NotFoundException('Change request not found');
    return changeRequest;
  }

  async create(dto: CreateChangeRequestDto, actingUserId: string | null) {
    const project = await this.projectRepo.findOne({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status !== 'active') {
      throw new BadRequestException(
        `Change requests can only be filed against an active project (this one is "${project.status}")`,
      );
    }

    const changeRequest = this.changeRequestRepo.create({
      project,
      title: dto.title,
      description: dto.description,
      hoursDelta: String(dto.hoursDelta),
      priceDeltaCents: dto.priceDeltaCents,
      status: 'pending',
      requestedBy: actingUserId ? ({ id: actingUserId } as any) : null,
      resolvedBy: null,
      resultingQuotation: null,
      resolvedAt: null,
    });
    const saved = await this.changeRequestRepo.save(changeRequest);

    await this.auditLogService.record({
      userId: actingUserId,
      action: 'change_request.created',
      entityType: 'ChangeRequest',
      entityId: saved.id,
      metadata: { projectId: project.id, hoursDelta: dto.hoursDelta, priceDeltaCents: dto.priceDeltaCents },
    });

    return this.get(saved.id);
  }

  private assertPending(changeRequest: ChangeRequest) {
    if (changeRequest.status !== 'pending') {
      throw new BadRequestException(`Change request is already ${changeRequest.status}`);
    }
  }

  /**
   * Approves a change request: creates a new DRAFT quotation version
   * reflecting the delta, and marks the change request itself resolved.
   * Confirmed with the person (MEMORY.md Section 04/44 update): this does
   * NOT touch the project's quotation link or budget snapshot — the new
   * version still has to go through the normal send → client-accept cycle
   * first, same as any other quotation. QuotationService.acceptCore is the
   * one place the project actually gets updated, and only once that
   * specific version is accepted. That keeps this "approve" step meaning
   * exactly what it says: staff have agreed the change is worth quoting,
   * not that the client has signed off on it yet.
   */
  async approve(id: string, actingUserId: string | null) {
    const changeRequest = await this.get(id);
    this.assertPending(changeRequest);

    const project = await this.projectRepo.findOne({
      where: { id: changeRequest.project.id },
      relations: ['quotation'],
    });
    if (!project) throw new NotFoundException('Project not found');

    await this.dataSource.transaction(async (manager) => {
      const newQuotation = await this.quotationService.applyChangeRequestRevision(
        project.quotation.id,
        {
          description: changeRequest.title,
          hours: parseFloat(changeRequest.hoursDelta),
          priceDeltaCents: changeRequest.priceDeltaCents,
        },
        actingUserId,
        manager,
      );

      changeRequest.status = 'approved';
      changeRequest.resultingQuotation = newQuotation;
      changeRequest.resolvedBy = actingUserId ? ({ id: actingUserId } as any) : null;
      changeRequest.resolvedAt = new Date();
      await manager.getRepository(ChangeRequest).save(changeRequest);
    });

    await this.auditLogService.record({
      userId: actingUserId,
      action: 'change_request.approved',
      entityType: 'ChangeRequest',
      entityId: id,
      metadata: { projectId: project.id, priceDeltaCents: changeRequest.priceDeltaCents },
    });

    return this.get(id);
  }

  async reject(id: string, actingUserId: string | null) {
    const changeRequest = await this.get(id);
    this.assertPending(changeRequest);

    changeRequest.status = 'rejected';
    changeRequest.resolvedBy = actingUserId ? ({ id: actingUserId } as any) : null;
    changeRequest.resolvedAt = new Date();
    await this.changeRequestRepo.save(changeRequest);

    await this.auditLogService.record({
      userId: actingUserId,
      action: 'change_request.rejected',
      entityType: 'ChangeRequest',
      entityId: id,
    });

    return this.get(id);
  }
}
