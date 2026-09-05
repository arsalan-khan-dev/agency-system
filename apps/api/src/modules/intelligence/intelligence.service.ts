import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AccuracySnapshot } from './entities/accuracy-snapshot.entity';
import { Project } from '../project/entities/project.entity';
import { Estimate } from '../estimation/entities/estimate.entity';

export interface AccuracyTrendPoint {
  projectId: string;
  projectTitle: string;
  projectTypeName: string;
  capturedAt: Date;
  estimatedHours: number;
  actualHours: number;
  hoursVariancePct: number;
  budgetCents: number;
  actualCostCents: number;
  costVariancePct: number;
}

export interface AccuracyByProjectTypeSummary {
  projectTypeName: string;
  snapshotCount: number;
  avgHoursVariancePct: number;
  avgCostVariancePct: number;
}

export interface SimilarEstimateMatch {
  estimateId: string;
  title: string;
  projectTypeName: string;
  matchingFeatureCount: number;
  totalFeatureCount: number;
  overlapScore: number; // Jaccard similarity on feature-ID sets, 0..1
  complexityKey: string;
  urgencyKey: string;
  finalPriceCents: number;
  totalHoursSnapshot: number;
  status: string;
}

/**
 * Phase 2 — Historical Intelligence (MEMORY.md Section 19).
 *
 * Deliberately structured, not ML-based, per explicit scope confirmation:
 * similarity is a Jaccard overlap score on feature-ID sets plus a project-
 * type match, not embeddings or any black-box scoring. Accuracy stats read
 * from the persisted AccuracySnapshot table (written once per project at
 * completion — see ProjectService.updateStatus) rather than recomputing
 * live from actuals/expenses on every call.
 */
@Injectable()
export class IntelligenceService {
  constructor(
    @InjectRepository(AccuracySnapshot) private snapshotRepo: Repository<AccuracySnapshot>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(Estimate) private estimateRepo: Repository<Estimate>,
  ) {}

  /**
   * Writes one AccuracySnapshot row for a just-completed project. Called
   * from ProjectService.updateStatus when status transitions to
   * 'completed'. Idempotent per project via the unique constraint on
   * project_id — if a snapshot already exists (e.g. a project is somehow
   * marked completed twice), this updates it in place rather than erroring,
   * since re-completion isn't a real workflow state but shouldn't crash one.
   *
   * Accepts an optional EntityManager (KI-008 fix) so the caller can run
   * this inside the SAME database transaction as the project's status
   * update — otherwise a snapshot-write failure after a successful status
   * save would silently leave a "completed" project with no accuracy data.
   * Falls back to the injected repos (no transaction) when called standalone.
   */
  async captureSnapshot(projectId: string, manager?: EntityManager): Promise<AccuracySnapshot> {
    const projectRepo = manager ? manager.getRepository(Project) : this.projectRepo;
    const snapshotRepo = manager ? manager.getRepository(AccuracySnapshot) : this.snapshotRepo;

    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: [
        'quotation',
        'quotation.estimate',
        'quotation.estimate.pricingProfile',
        'quotation.estimate.projectType',
        'actuals',
        'expenses',
      ],
    });
    if (!project) throw new NotFoundException('Project not found');

    const estimate = project.quotation.estimate;
    const estimatedHours = parseFloat(estimate.totalHoursSnapshot);
    const actualHours = project.actuals.reduce((sum, a) => sum + parseFloat(a.hoursLogged), 0);
    const hoursVariance = actualHours - estimatedHours;
    const hoursVariancePct = estimatedHours > 0 ? hoursVariance / estimatedHours : 0;

    const rateCents = estimate.pricingProfile.baseHourlyRateCents;
    const laborCostCents = Math.round(actualHours * rateCents);
    const expensesCents = project.expenses.reduce((sum, e) => sum + e.amountCents, 0);
    const actualCostCents = laborCostCents + expensesCents;
    const budgetCents = project.budgetCentsSnapshot;
    const costVarianceCents = actualCostCents - budgetCents;
    const costVariancePct = budgetCents > 0 ? costVarianceCents / budgetCents : 0;

    const existing = await snapshotRepo.findOne({ where: { project: { id: projectId } } });

    const snapshot = snapshotRepo.create({
      ...(existing ?? {}),
      project,
      estimatedHours: String(estimatedHours),
      actualHours: String(actualHours),
      hoursVariance: String(hoursVariance),
      hoursVariancePct: String(hoursVariancePct),
      budgetCents,
      actualCostCents,
      costVarianceCents,
      costVariancePct: String(costVariancePct),
      projectTypeNameSnapshot: estimate.projectType.name,
    });

    return snapshotRepo.save(snapshot);
  }

  /** Raw trend points, most recent first — for charting accuracy over time. */
  async getAccuracyTrend(): Promise<AccuracyTrendPoint[]> {
    const snapshots = await this.snapshotRepo.find({
      relations: ['project'],
      order: { capturedAt: 'DESC' },
    });

    return snapshots.map((s) => ({
      projectId: s.project.id,
      projectTitle: s.project.title,
      projectTypeName: s.projectTypeNameSnapshot,
      capturedAt: s.capturedAt,
      estimatedHours: parseFloat(s.estimatedHours),
      actualHours: parseFloat(s.actualHours),
      hoursVariancePct: parseFloat(s.hoursVariancePct),
      budgetCents: s.budgetCents,
      actualCostCents: s.actualCostCents,
      costVariancePct: parseFloat(s.costVariancePct),
    }));
  }

  /** Aggregated accuracy (avg variance) grouped by project type — "is estimation improving, and where". */
  async getAccuracyByProjectType(): Promise<AccuracyByProjectTypeSummary[]> {
    const raw = await this.snapshotRepo
      .createQueryBuilder('s')
      .select('s.projectTypeNameSnapshot', 'projectTypeName')
      .addSelect('COUNT(*)', 'snapshotCount')
      .addSelect('AVG(s.hoursVariancePct)', 'avgHoursVariancePct')
      .addSelect('AVG(s.costVariancePct)', 'avgCostVariancePct')
      .groupBy('s.projectTypeNameSnapshot')
      .getRawMany<{
        projectTypeName: string;
        snapshotCount: string;
        avgHoursVariancePct: string;
        avgCostVariancePct: string;
      }>();

    return raw.map((row) => ({
      projectTypeName: row.projectTypeName,
      snapshotCount: parseInt(row.snapshotCount, 10),
      avgHoursVariancePct: parseFloat(row.avgHoursVariancePct),
      avgCostVariancePct: parseFloat(row.avgCostVariancePct),
    }));
  }

  /**
   * Structured similarity search: given a project type + a set of feature
   * IDs (typically from an in-progress estimate draft), finds past
   * estimates for the SAME project type and ranks them by Jaccard overlap
   * of their feature-ID sets. No embeddings, no ML — explainable by
   * construction (the overlap score IS the explanation).
   */
  async findSimilarEstimates(projectTypeId: string, featureIds: string[], limit = 5): Promise<SimilarEstimateMatch[]> {
    const targetSet = new Set(featureIds);

    const candidates = await this.estimateRepo.find({
      where: { projectType: { id: projectTypeId } },
      relations: ['features', 'features.feature', 'projectType'],
      order: { createdAt: 'DESC' },
    });

    const scored: SimilarEstimateMatch[] = candidates.map((estimate) => {
      const candidateIds = estimate.features.map((f) => f.feature?.id).filter(Boolean) as string[];
      const candidateSet = new Set(candidateIds);

      let intersectionSize = 0;
      for (const id of candidateSet) {
        if (targetSet.has(id)) intersectionSize++;
      }
      const unionSize = new Set([...targetSet, ...candidateSet]).size;
      const overlapScore = unionSize > 0 ? intersectionSize / unionSize : 0;

      return {
        estimateId: estimate.id,
        title: estimate.title,
        projectTypeName: estimate.projectType.name,
        matchingFeatureCount: intersectionSize,
        totalFeatureCount: candidateSet.size,
        overlapScore,
        complexityKey: estimate.complexityKey,
        urgencyKey: estimate.urgencyKey,
        finalPriceCents: estimate.finalPriceCents,
        totalHoursSnapshot: parseFloat(estimate.totalHoursSnapshot),
        status: estimate.status,
      };
    });

    return scored
      .filter((m) => m.overlapScore > 0)
      .sort((a, b) => b.overlapScore - a.overlapScore)
      .slice(0, limit);
  }
}
