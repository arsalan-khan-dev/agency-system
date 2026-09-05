import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingProfile } from './entities/pricing-profile.entity';
import { PricingRule, PricingRuleType } from './entities/pricing-rule.entity';
import { CreatePricingProfileDto, UpdatePricingProfileDto } from './dto/pricing-profile.dto';
import { CreatePricingRuleDto, UpdatePricingRuleDto } from './dto/pricing-rule.dto';
import { AuditLogService } from '../identity/audit-log.service';

export interface PriceCalculationInput {
  pricingProfileId: string;
  totalHours: number;
  complexityKey: string;
  urgencyKey: string;
}

export interface PriceCalculationResult {
  profile: PricingProfile;
  totalHours: number;
  baseCostCents: number;
  complexityMultiplier: number;
  complexityLabel: string;
  urgencyMultiplier: number;
  urgencyLabel: string;
  rawCalculatedPriceCents: number;
  calculatedPriceCents: number; // floor-enforced
  flooredByMinimum: boolean;
}

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PricingProfile) private profileRepo: Repository<PricingProfile>,
    @InjectRepository(PricingRule) private ruleRepo: Repository<PricingRule>,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ---------- Pricing Profiles ----------
  listProfiles() {
    return this.profileRepo.find({ order: { name: 'ASC' } });
  }

  async getProfile(id: string) {
    const profile = await this.profileRepo.findOne({ where: { id }, relations: ['rules'] });
    if (!profile) throw new NotFoundException('Pricing profile not found');
    return profile;
  }

  async createProfile(dto: CreatePricingProfileDto, actingUserId: string | null = null) {
    const profile = await this.profileRepo.save(this.profileRepo.create(dto));
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'pricing.profile.created',
      entityType: 'PricingProfile',
      entityId: profile.id,
      metadata: { name: profile.name, currency: profile.currency },
    });
    return profile;
  }

  async updateProfile(id: string, dto: UpdatePricingProfileDto, actingUserId: string | null = null) {
    const profile = await this.getProfile(id);
    Object.assign(profile, dto);
    const saved = await this.profileRepo.save(profile);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'pricing.profile.updated',
      entityType: 'PricingProfile',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });
    return saved;
  }

  async deleteProfile(id: string, actingUserId: string | null = null) {
    const profile = await this.getProfile(id);
    await this.profileRepo.softRemove(profile);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'pricing.profile.deleted',
      entityType: 'PricingProfile',
      entityId: id,
      metadata: { name: profile.name },
    });
    return { success: true };
  }

  // ---------- Pricing Rules ----------
  async listRulesForProfile(profileId: string) {
    return this.ruleRepo.find({ where: { profile: { id: profileId } }, order: { ruleType: 'ASC', key: 'ASC' } });
  }

  async createRule(dto: CreatePricingRuleDto, actingUserId: string | null = null) {
    const profile = await this.profileRepo.findOne({ where: { id: dto.profileId } });
    if (!profile) throw new NotFoundException('Pricing profile not found');

    const existing = await this.ruleRepo.findOne({
      where: { profile: { id: profile.id }, ruleType: dto.ruleType, key: dto.key },
    });
    if (existing) {
      throw new BadRequestException(
        `A ${dto.ruleType} rule with key "${dto.key}" already exists for this profile`,
      );
    }

    const rule = await this.ruleRepo.save(
      this.ruleRepo.create({
        profile,
        ruleType: dto.ruleType,
        key: dto.key,
        label: dto.label,
        multiplier: String(dto.multiplier),
      }),
    );
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'pricing.rule.created',
      entityType: 'PricingRule',
      entityId: rule.id,
      metadata: { profileId: profile.id, ruleType: dto.ruleType, key: dto.key, multiplier: dto.multiplier },
    });
    return rule;
  }

  async updateRule(id: string, dto: UpdatePricingRuleDto, actingUserId: string | null = null) {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Pricing rule not found');
    if (dto.label !== undefined) rule.label = dto.label;
    if (dto.multiplier !== undefined) rule.multiplier = String(dto.multiplier);
    const saved = await this.ruleRepo.save(rule);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'pricing.rule.updated',
      entityType: 'PricingRule',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });
    return saved;
  }

  async deleteRule(id: string, actingUserId: string | null = null) {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Pricing rule not found');
    await this.ruleRepo.remove(rule);
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'pricing.rule.deleted',
      entityType: 'PricingRule',
      entityId: id,
      metadata: { ruleType: rule.ruleType, key: rule.key },
    });
    return { success: true };
  }

  private async findRule(profileId: string, ruleType: PricingRuleType, key: string): Promise<PricingRule> {
    const rule = await this.ruleRepo.findOne({ where: { profile: { id: profileId }, ruleType, key } });
    if (!rule) {
      throw new BadRequestException(
        `No ${ruleType} pricing rule found for key "${key}" on this pricing profile`,
      );
    }
    return rule;
  }

  /**
   * The single structured pricing calculation used by the Estimation Engine.
   * Deterministic: same inputs always produce the same output. Never returns
   * a calculated price below the profile's minimumPriceCents floor — that
   * floor only guards the SYSTEM recommendation; a human may still manually
   * override lower elsewhere, but must supply a justification (enforced in
   * EstimationService, not here). See MEMORY.md Section 05 / ADR-004.
   */
  async calculatePrice(input: PriceCalculationInput): Promise<PriceCalculationResult> {
    const profile = await this.getProfile(input.pricingProfileId);
    if (!profile.isActive) {
      throw new BadRequestException('This pricing profile is inactive');
    }

    const complexityRule = await this.findRule(profile.id, 'complexity', input.complexityKey);
    const urgencyRule = await this.findRule(profile.id, 'urgency', input.urgencyKey);

    const complexityMultiplier = parseFloat(complexityRule.multiplier);
    const urgencyMultiplier = parseFloat(urgencyRule.multiplier);

    const baseCostCents = Math.round(input.totalHours * profile.baseHourlyRateCents);
    const rawCalculatedPriceCents = Math.round(baseCostCents * complexityMultiplier * urgencyMultiplier);
    const calculatedPriceCents = Math.max(rawCalculatedPriceCents, profile.minimumPriceCents);

    return {
      profile,
      totalHours: input.totalHours,
      baseCostCents,
      complexityMultiplier,
      complexityLabel: complexityRule.label,
      urgencyMultiplier,
      urgencyLabel: urgencyRule.label,
      rawCalculatedPriceCents,
      calculatedPriceCents,
      flooredByMinimum: rawCalculatedPriceCents < profile.minimumPriceCents,
    };
  }
}
