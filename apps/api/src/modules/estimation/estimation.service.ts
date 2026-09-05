import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EstimationQuestion } from './entities/estimation-question.entity';
import { Estimate } from './entities/estimate.entity';
import { EstimateFeature } from './entities/estimate-feature.entity';
import { ProjectType } from '../catalog/entities/project-type.entity';
import { Feature } from '../catalog/entities/feature.entity';
import { PricingService } from '../pricing/pricing.service';
import { CreateEstimationQuestionDto, UpdateEstimationQuestionDto } from './dto/estimation-question.dto';
import { CreateEstimateDto, AdjustEstimatePriceDto } from './dto/estimate.dto';
import { AuditLogService } from '../identity/audit-log.service';

@Injectable()
export class EstimationService {
  constructor(
    @InjectRepository(EstimationQuestion) private questionRepo: Repository<EstimationQuestion>,
    @InjectRepository(Estimate) private estimateRepo: Repository<Estimate>,
    @InjectRepository(EstimateFeature) private estimateFeatureRepo: Repository<EstimateFeature>,
    @InjectRepository(ProjectType) private projectTypeRepo: Repository<ProjectType>,
    @InjectRepository(Feature) private featureRepo: Repository<Feature>,
    private readonly pricingService: PricingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ---------- Estimation Questions ----------
  async listQuestions(projectTypeId?: string) {
    if (projectTypeId) {
      return this.questionRepo.find({
        where: { projectType: { id: projectTypeId }, isActive: true },
        relations: ['projectType'],
      });
    }
    return this.questionRepo.find({ relations: ['projectType'] });
  }

  async createQuestion(dto: CreateEstimationQuestionDto, actingUserId: string | null = null) {
    const projectType = await this.projectTypeRepo.findOne({ where: { id: dto.projectTypeId } });
    if (!projectType) throw new NotFoundException('Project type not found');

    const question = await this.questionRepo.save(
      this.questionRepo.create({
        projectType,
        prompt: dto.prompt,
        answerType: dto.answerType,
        options: dto.options,
      }),
    );
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'estimation_question.created',
      entityType: 'EstimationQuestion',
      entityId: question.id,
      metadata: { projectTypeId: projectType.id, answerType: dto.answerType },
    });
    return question;
  }

  async updateQuestion(id: string, dto: UpdateEstimationQuestionDto, actingUserId: string | null = null) {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Estimation question not found');
    Object.assign(question, dto);
    const saved = await this.questionRepo.save(question);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'estimation_question.updated',
      entityType: 'EstimationQuestion',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });
    return saved;
  }

  async deleteQuestion(id: string, actingUserId: string | null = null) {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Estimation question not found');
    await this.questionRepo.softRemove(question);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'estimation_question.deleted',
      entityType: 'EstimationQuestion',
      entityId: id,
    });
    return { success: true };
  }

  // ---------- Estimates ----------
  async listEstimates() {
    return this.estimateRepo.find({
      relations: ['projectType', 'pricingProfile', 'features', 'features.feature', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async getEstimate(id: string) {
    const estimate = await this.estimateRepo.findOne({
      where: { id },
      relations: ['projectType', 'pricingProfile', 'features', 'features.feature', 'createdBy'],
    });
    if (!estimate) throw new NotFoundException('Estimate not found');
    return estimate;
  }

  /**
   * Creates a draft estimate: validates the selected features belong to the
   * chosen project type (wiring integrity — see MEMORY.md Section 22),
   * delegates the actual price calculation to PricingService (single source
   * of truth for pricing logic), and snapshots every value used so later
   * catalog/pricing changes never rewrite this estimate's history.
   */
  async createEstimate(dto: CreateEstimateDto, createdByUserId: string | null) {
    const projectType = await this.projectTypeRepo.findOne({ where: { id: dto.projectTypeId } });
    if (!projectType) throw new NotFoundException('Project type not found');

    const features = await this.featureRepo.find({
      where: { id: In(dto.featureIds) },
      relations: ['projectType'],
    });

    if (features.length !== dto.featureIds.length) {
      throw new NotFoundException('One or more selected features were not found');
    }

    const mismatched = features.filter((f) => f.projectType.id !== dto.projectTypeId);
    if (mismatched.length > 0) {
      throw new BadRequestException(
        `Feature(s) [${mismatched.map((f) => f.name).join(', ')}] do not belong to the selected project type`,
      );
    }

    const totalHours = features.reduce((sum, f) => sum + parseFloat(f.baselineHours), 0);

    const calculation = await this.pricingService.calculatePrice({
      pricingProfileId: dto.pricingProfileId,
      totalHours,
      complexityKey: dto.complexityKey,
      urgencyKey: dto.urgencyKey,
    });

    const estimate = this.estimateRepo.create({
      title: dto.title,
      projectType,
      pricingProfile: calculation.profile,
      complexityKey: dto.complexityKey,
      urgencyKey: dto.urgencyKey,
      totalHoursSnapshot: String(totalHours),
      baseCostCentsSnapshot: calculation.baseCostCents,
      complexityMultiplierSnapshot: String(calculation.complexityMultiplier),
      urgencyMultiplierSnapshot: String(calculation.urgencyMultiplier),
      calculatedPriceCents: calculation.calculatedPriceCents,
      manualAdjustedPriceCents: null,
      adjustmentJustification: null,
      finalPriceCents: calculation.calculatedPriceCents,
      status: 'draft',
      createdBy: createdByUserId ? ({ id: createdByUserId } as any) : null,
    });

    const savedEstimate = await this.estimateRepo.save(estimate);

    const estimateFeatures = features.map((feature) =>
      this.estimateFeatureRepo.create({
        estimate: savedEstimate,
        feature,
        featureNameSnapshot: feature.name,
        baselineHoursSnapshot: feature.baselineHours,
      }),
    );
    await this.estimateFeatureRepo.save(estimateFeatures);

    // KI-007 follow-up: creation itself was previously untracked in the
    // audit log — only later status transitions (finalize) were. The
    // createdBy FK on the row answers "who owns this estimate" but not
    // "when was it created, queryable alongside every other event."
    await this.auditLogService.record({
      userId: createdByUserId,
      action: 'estimate.created',
      entityType: 'Estimate',
      entityId: savedEstimate.id,
      metadata: {
        title: dto.title,
        projectTypeId: dto.projectTypeId,
        pricingProfileId: dto.pricingProfileId,
        finalPriceCents: calculation.calculatedPriceCents,
      },
    });

    return this.getEstimate(savedEstimate.id);
  }

  /**
   * Manual price override. ALWAYS requires a justification — see MEMORY.md
   * Section 05 (Business rules): "Manual pricing adjustment requires
   * justification." Only allowed while the estimate is still a draft;
   * finalized estimates are immutable inputs to quotation generation
   * (mirrors ADR-005's immutable-quotation principle one step earlier).
   */
  async adjustPrice(id: string, dto: AdjustEstimatePriceDto, actingUserId: string | null = null) {
    const estimate = await this.getEstimate(id);
    if (estimate.status !== 'draft') {
      throw new BadRequestException('Only draft estimates can have their price adjusted');
    }

    const previousFinalPriceCents = estimate.finalPriceCents;
    estimate.manualAdjustedPriceCents = dto.manualAdjustedPriceCents;
    estimate.adjustmentJustification = dto.justification;
    estimate.finalPriceCents = dto.manualAdjustedPriceCents;

    await this.estimateRepo.save(estimate);

    // Manual price overrides are exactly the kind of action an audit trail
    // exists for — a human deliberately deviated from the system-calculated
    // price. Logging the before/after price and the required justification
    // together means this is fully reconstructable later without needing
    // to trust that manualAdjustedPriceCents on the row was never touched
    // again after the fact.
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'estimate.price_adjusted',
      entityType: 'Estimate',
      entityId: id,
      metadata: {
        previousFinalPriceCents,
        newFinalPriceCents: dto.manualAdjustedPriceCents,
        justification: dto.justification,
      },
    });

    return this.getEstimate(id);
  }

  async clearAdjustment(id: string, actingUserId: string | null = null) {
    const estimate = await this.getEstimate(id);
    if (estimate.status !== 'draft') {
      throw new BadRequestException('Only draft estimates can be modified');
    }
    estimate.manualAdjustedPriceCents = null;
    estimate.adjustmentJustification = null;
    estimate.finalPriceCents = estimate.calculatedPriceCents;
    await this.estimateRepo.save(estimate);

    await this.auditLogService.record({
      userId: actingUserId,
      action: 'estimate.price_adjustment_cleared',
      entityType: 'Estimate',
      entityId: id,
      metadata: { revertedToCalculatedPriceCents: estimate.calculatedPriceCents },
    });

    return this.getEstimate(id);
  }

  async finalizeEstimate(id: string, actingUserId: string | null = null) {
    const estimate = await this.getEstimate(id);
    if (estimate.status === 'finalized') {
      throw new BadRequestException('Estimate is already finalized');
    }
    estimate.status = 'finalized';
    await this.estimateRepo.save(estimate);

    await this.auditLogService.record({
      userId: actingUserId,
      action: 'estimate.finalized',
      entityType: 'Estimate',
      entityId: id,
      metadata: { finalPriceCents: estimate.finalPriceCents },
    });

    return this.getEstimate(id);
  }
}
