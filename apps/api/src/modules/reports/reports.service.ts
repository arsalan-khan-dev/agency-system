import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quotation, QuotationStatus } from '../quotation/entities/quotation.entity';
import { Project } from '../project/entities/project.entity';
import { Estimate } from '../estimation/entities/estimate.entity';

export interface ConversionFunnelPoint {
  status: QuotationStatus;
  count: number;
}

export interface RevenueByProjectTypePoint {
  projectTypeName: string;
  acceptedQuotationCount: number;
  totalRevenueCents: number;
}

export interface EstimatedVsActualHoursPoint {
  projectId: string;
  projectTitle: string;
  estimatedHours: number;
  actualHours: number;
}

export interface ProfitabilityComparisonPoint {
  projectId: string;
  projectTitle: string;
  budgetCents: number;
  totalActualCostCents: number;
  profitCents: number;
  isOverBudget: boolean;
}

/**
 * All queries here read real persisted data — no fabricated numbers. Where
 * there isn't enough data yet, callers get an empty array back and the
 * frontend renders an explicit empty/insufficient-data state rather than a
 * chart with invented values. See MEMORY.md Section 10.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Quotation) private quotationRepo: Repository<Quotation>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Estimate) private estimateRepo: Repository<Estimate>,
  ) {}

  /** Count of quotations at each stage of the lifecycle. */
  async getConversionFunnel(): Promise<ConversionFunnelPoint[]> {
    const raw = await this.quotationRepo
      .createQueryBuilder('q')
      .select('q.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('q.status')
      .getRawMany<{ status: QuotationStatus; count: string }>();

    return raw.map((row) => ({ status: row.status, count: parseInt(row.count, 10) }));
  }

  /** Revenue from ACCEPTED quotations, grouped by the project type of their originating estimate. */
  async getRevenueByProjectType(): Promise<RevenueByProjectTypePoint[]> {
    const raw = await this.quotationRepo
      .createQueryBuilder('q')
      .innerJoin('q.estimate', 'estimate')
      .innerJoin('estimate.projectType', 'projectType')
      .select('projectType.name', 'projectTypeName')
      .addSelect('COUNT(*)', 'acceptedQuotationCount')
      .addSelect('SUM(q.priceCentsSnapshot)', 'totalRevenueCents')
      .where('q.status = :status', { status: 'accepted' })
      .groupBy('projectType.name')
      .getRawMany<{ projectTypeName: string; acceptedQuotationCount: string; totalRevenueCents: string }>();

    return raw.map((row) => ({
      projectTypeName: row.projectTypeName,
      acceptedQuotationCount: parseInt(row.acceptedQuotationCount, 10),
      totalRevenueCents: parseInt(row.totalRevenueCents, 10),
    }));
  }

  /** Estimated hours (from the estimate) vs. actual logged hours, per project. */
  async getEstimatedVsActualHours(): Promise<EstimatedVsActualHoursPoint[]> {
    const projects = await this.projectRepo.find({
      relations: ['quotation', 'quotation.estimate', 'actuals'],
    });

    return projects.map((project) => {
      const estimatedHours = parseFloat(project.quotation.estimate.totalHoursSnapshot);
      const actualHours = project.actuals.reduce((sum, a) => sum + parseFloat(a.hoursLogged), 0);
      return {
        projectId: project.id,
        projectTitle: project.title,
        estimatedHours,
        actualHours,
      };
    });
  }

  /** Budget vs. actual cost per project — same math as ProjectService.getProfitability, aggregated for comparison. */
  async getProfitabilityComparison(): Promise<ProfitabilityComparisonPoint[]> {
    const projects = await this.projectRepo.find({
      relations: ['quotation', 'quotation.estimate', 'quotation.estimate.pricingProfile', 'actuals', 'expenses'],
    });

    return projects.map((project) => {
      const rateCents = project.quotation.estimate.pricingProfile.baseHourlyRateCents;
      const actualHours = project.actuals.reduce((sum, a) => sum + parseFloat(a.hoursLogged), 0);
      const laborCostCents = Math.round(actualHours * rateCents);
      const expensesCents = project.expenses.reduce((sum, e) => sum + e.amountCents, 0);
      const totalActualCostCents = laborCostCents + expensesCents;
      const profitCents = project.budgetCentsSnapshot - totalActualCostCents;

      return {
        projectId: project.id,
        projectTitle: project.title,
        budgetCents: project.budgetCentsSnapshot,
        totalActualCostCents,
        profitCents,
        isOverBudget: profitCents < 0,
      };
    });
  }
}
