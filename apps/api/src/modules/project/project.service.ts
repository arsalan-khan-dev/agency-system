import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectActual } from './entities/project-actual.entity';
import { Expense } from './entities/expense.entity';
import { Quotation } from '../quotation/entities/quotation.entity';
import { CreateProjectFromQuotationDto, UpdateProjectStatusDto } from './dto/project.dto';
import { LogActualDto, LogExpenseDto } from './dto/actual-expense.dto';
import { AuditLogService } from '../identity/audit-log.service';
import { IntelligenceService } from '../intelligence/intelligence.service';

export interface ProfitabilitySummary {
  budgetCents: number;
  actualHours: number;
  hourlyCostBasisCents: number;
  laborCostCents: number;
  expensesCents: number;
  totalActualCostCents: number;
  profitCents: number; // budget - totalActualCost; negative = over budget
  isOverBudget: boolean;
}

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(ProjectActual) private actualRepo: Repository<ProjectActual>,
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(Quotation) private quotationRepo: Repository<Quotation>,
    private readonly auditLogService: AuditLogService,
    private readonly intelligenceService: IntelligenceService,
    private readonly dataSource: DataSource,
  ) {}

  list() {
    return this.projectRepo.find({
      relations: ['client', 'quotation', 'actuals', 'expenses'],
      order: { createdAt: 'DESC' },
    });
  }

  async get(id: string) {
    const project = await this.projectRepo.findOne({
      where: { id },
      relations: [
        'client',
        'quotation',
        'quotation.estimate',
        'quotation.estimate.pricingProfile',
        'actuals',
        'expenses',
      ],
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  /**
   * Creates a Project ONLY from an `accepted` Quotation — see MEMORY.md
   * Section 05: "Project is created only after quotation acceptance."
   * Rejects every other status explicitly rather than just checking != draft,
   * so a sent/rejected/expired quotation can never slip through.
   */
  async createFromQuotation(dto: CreateProjectFromQuotationDto) {
    const quotation = await this.quotationRepo.findOne({
      where: { id: dto.quotationId },
      relations: ['client'],
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.status !== 'accepted') {
      throw new BadRequestException(
        `Only an accepted quotation can be converted into a project (this one is "${quotation.status}")`,
      );
    }

    const existing = await this.projectRepo.findOne({ where: { quotation: { id: quotation.id } } });
    if (existing) {
      throw new BadRequestException('A project already exists for this quotation');
    }

    const project = this.projectRepo.create({
      quotation,
      client: quotation.client,
      title: quotation.titleSnapshot,
      budgetCentsSnapshot: quotation.priceCentsSnapshot,
      status: 'active',
      startedAt: new Date(),
      completedAt: null,
    });

    const saved = await this.projectRepo.save(project);
    return this.get(saved.id);
  }

  async updateStatus(id: string, dto: UpdateProjectStatusDto) {
    const project = await this.get(id);
    const isNewlyCompleted = dto.status === 'completed' && project.status !== 'completed';

    // KI-008 fix: the status save and the accuracy snapshot capture must
    // succeed or fail together. Previously these were two independent
    // save() calls — if captureSnapshot failed after the status save
    // committed, a project could end up "completed" with no accuracy data
    // and no error surfaced. Wrapping both in one transaction means a
    // snapshot failure now rolls back the status change too, so the
    // person sees the actual error instead of silent, undetectable data loss.
    await this.dataSource.transaction(async (manager) => {
      project.status = dto.status;
      if (dto.status === 'completed' && !project.completedAt) {
        project.completedAt = new Date();
      }
      await manager.getRepository(Project).save(project);

      if (isNewlyCompleted) {
        await this.intelligenceService.captureSnapshot(id, manager);
      }
    });

    return this.get(id);
  }

  async logActual(projectId: string, dto: LogActualDto, loggedByUserId: string | null) {
    const project = await this.get(projectId);
    const actual = this.actualRepo.create({
      project,
      description: dto.description,
      hoursLogged: String(dto.hoursLogged),
      loggedAt: dto.loggedAt ? new Date(dto.loggedAt) : new Date(),
      loggedBy: loggedByUserId ? ({ id: loggedByUserId } as any) : null,
    });
    await this.actualRepo.save(actual);
    return this.get(projectId);
  }

  async logExpense(projectId: string, dto: LogExpenseDto, loggedByUserId: string | null) {
    const project = await this.get(projectId);
    const expense = this.expenseRepo.create({
      project,
      description: dto.description,
      amountCents: dto.amountCents,
      incurredAt: dto.incurredAt ? new Date(dto.incurredAt) : new Date(),
    });
    await this.expenseRepo.save(expense);
    await this.auditLogService.record({
      userId: loggedByUserId,
      action: 'expense.logged',
      entityType: 'Project',
      entityId: projectId,
      metadata: { amountCents: dto.amountCents, description: dto.description },
    });
    return this.get(projectId);
  }

  /**
   * Budget vs. actual profitability. Hourly cost basis = the same
   * PricingProfile.baseHourlyRateCents used at estimation time (see
   * MEMORY.md ADR-013) — actuals are compared against the rate the estimate
   * itself was priced on, not a separate/undefined internal cost rate.
   */
  async getProfitability(projectId: string): Promise<ProfitabilitySummary> {
    const project = await this.get(projectId);

    const rateCents = project.quotation.estimate.pricingProfile.baseHourlyRateCents;

    const actualHours = project.actuals.reduce((sum, a) => sum + parseFloat(a.hoursLogged), 0);
    const laborCostCents = Math.round(actualHours * rateCents);
    const expensesCents = project.expenses.reduce((sum, e) => sum + e.amountCents, 0);
    const totalActualCostCents = laborCostCents + expensesCents;
    const profitCents = project.budgetCentsSnapshot - totalActualCostCents;

    return {
      budgetCents: project.budgetCentsSnapshot,
      actualHours,
      hourlyCostBasisCents: rateCents,
      laborCostCents,
      expensesCents,
      totalActualCostCents,
      profitCents,
      isOverBudget: profitCents < 0,
    };
  }
}
