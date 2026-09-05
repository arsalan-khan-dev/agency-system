import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { randomUUID, randomBytes } from 'crypto';
import * as fs from 'fs';
import { Quotation, QuotationStatus } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { Estimate } from '../estimation/entities/estimate.entity';
import { Client } from '../client/entities/client.entity';
import { GenerateQuotationDto } from './dto/quotation.dto';
import { AuditLogService } from '../identity/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrgSettingsService } from '../org-settings/org-settings.service';
import { OrgSettings } from '../org-settings/entities/org-settings.entity';
import { ChangeRequest } from '../change-request/entities/change-request.entity';
import { Project } from '../project/entities/project.entity';

const LOCKED_STATUSES: QuotationStatus[] = ['sent', 'accepted', 'rejected', 'expired'];
const ACCEPTANCE_TOKEN_TTL_DAYS = 30;

@Injectable()
export class QuotationService {
  constructor(
    @InjectRepository(Quotation) private quotationRepo: Repository<Quotation>,
    @InjectRepository(QuotationItem) private itemRepo: Repository<QuotationItem>,
    @InjectRepository(Estimate) private estimateRepo: Repository<Estimate>,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
    private readonly orgSettingsService: OrgSettingsService,
    private readonly dataSource: DataSource,
  ) {}

  list() {
    return this.quotationRepo.find({
      relations: ['client', 'estimate', 'items'],
      order: { quotationGroupId: 'ASC', version: 'DESC' },
    });
  }

  async get(id: string) {
    const quotation = await this.quotationRepo.findOne({
      where: { id },
      relations: ['client', 'estimate', 'items'],
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }

  /** All versions belonging to the same quotation, newest first. */
  async getVersionHistory(quotationGroupId: string) {
    return this.quotationRepo.find({
      where: { quotationGroupId },
      relations: ['client', 'items'],
      order: { version: 'DESC' },
    });
  }

  /**
   * Generates quotation v1 from a FINALIZED estimate + a client. Snapshots
   * only client-safe data (price + item descriptions/hours) — never the
   * estimate's internal cost/margin/multiplier fields. See MEMORY.md
   * Section 05: "Internal cost/margin data must never appear in client
   * PDFs" and "Project is created only after quotation acceptance."
   */
  async generate(dto: GenerateQuotationDto, actingUserId: string | null = null) {
    const estimate = await this.estimateRepo.findOne({
      where: { id: dto.estimateId },
      relations: ['features', 'projectType', 'pricingProfile'],
    });
    if (!estimate) throw new NotFoundException('Estimate not found');
    if (estimate.status !== 'finalized') {
      throw new BadRequestException('Only finalized estimates can be turned into a quotation');
    }

    const client = await this.clientRepo.findOne({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException('Client not found');

    // Generate the id in application code so it can double as the
    // quotationGroupId anchor on the SAME insert — quotationGroupId is
    // NOT NULL, so it can't be patched in after the fact from a DB-generated id.
    const newId = randomUUID();
    const recurringInterval = dto.recurringInterval ?? 'none';

    const quotation = this.quotationRepo.create({
      id: newId,
      estimate,
      client,
      quotationGroupId: newId,
      version: 1,
      status: 'draft',
      clientNameSnapshot: client.name,
      titleSnapshot: estimate.title,
      priceCentsSnapshot: estimate.finalPriceCents,
      // Phase 2 task 4: currency is snapshotted from the pricing profile at
      // generation time, same as the price itself — see ADR-005.
      currency: estimate.pricingProfile.currency,
      recurringInterval,
      // Recurring instances generated later (see generateNextRecurringInstance)
      // share this id as their recurringSeriesId; a one-off quotation has none.
      recurringSeriesId: recurringInterval !== 'none' ? newId : null,
      nextBillingDate: null,
      lastReminderSentAt: null,
      acceptanceToken: null,
      acceptanceTokenExpiresAt: null,
      sentAt: null,
      respondedAt: null,
    });

    const saved = await this.quotationRepo.save(quotation);

    const items = estimate.features.map((ef) =>
      this.itemRepo.create({
        quotation: saved,
        description: ef.featureNameSnapshot,
        hours: ef.baselineHoursSnapshot,
      }),
    );
    await this.itemRepo.save(items);

    // KI-007 follow-up: quotation creation itself was previously untracked
    // — only later status transitions (sent/accepted/rejected/expired) were
    // logged. Generation is the moment a specific price gets attached to a
    // specific client, which is worth its own queryable trail entry.
    await this.auditLogService.record({
      userId: actingUserId,
      action: 'quotation.generated',
      entityType: 'Quotation',
      entityId: saved.id,
      metadata: {
        estimateId: estimate.id,
        clientId: client.id,
        priceCentsSnapshot: saved.priceCentsSnapshot,
        currency: saved.currency,
        recurringInterval,
      },
    });

    return this.get(saved.id);
  }

  /**
   * Enforces immutability: sent+ quotations reject direct edits at this
   * layer — see MEMORY.md Section 05: "Sent quotations are immutable" /
   * "Changes after sending create a new quotation version." Callers wanting
   * to change a sent quotation must call reviseFrom() instead.
   */
  private assertMutable(quotation: Quotation) {
    if (LOCKED_STATUSES.includes(quotation.status)) {
      throw new BadRequestException(
        `Quotation is ${quotation.status} and immutable. Create a new version instead of editing it directly.`,
      );
    }
  }

  /**
   * Creates a new version of an existing quotation (any status), copying
   * client/estimate linkage and item snapshot forward, reset to draft. The
   * PREVIOUS version's row is never mutated — this is the only sanctioned
   * path for "changing" a sent quotation.
   */
  async reviseFrom(existingId: string, actingUserId: string | null = null) {
    const existing = await this.get(existingId);

    const latestVersion = await this.quotationRepo
      .createQueryBuilder('q')
      .where('q.quotationGroupId = :groupId', { groupId: existing.quotationGroupId })
      .orderBy('q.version', 'DESC')
      .getOne();

    const nextVersion = (latestVersion?.version ?? existing.version) + 1;

    const revised = this.quotationRepo.create({
      estimate: existing.estimate,
      client: existing.client,
      quotationGroupId: existing.quotationGroupId,
      version: nextVersion,
      status: 'draft',
      clientNameSnapshot: existing.clientNameSnapshot,
      titleSnapshot: existing.titleSnapshot,
      priceCentsSnapshot: existing.priceCentsSnapshot,
      currency: existing.currency,
      // A revision of a recurring quotation stays part of the same series;
      // recurring settings and billing token are otherwise reset like any
      // other draft (a new send/accept cycle starts them fresh).
      recurringInterval: existing.recurringInterval,
      recurringSeriesId: existing.recurringSeriesId,
      nextBillingDate: null,
      lastReminderSentAt: null,
      acceptanceToken: null,
      acceptanceTokenExpiresAt: null,
      sentAt: null,
      respondedAt: null,
    });
    const saved = await this.quotationRepo.save(revised);

    const items = existing.items.map((item) =>
      this.itemRepo.create({ quotation: saved, description: item.description, hours: item.hours }),
    );
    await this.itemRepo.save(items);

    await this.auditLogService.record({
      userId: actingUserId,
      action: 'quotation.revised',
      entityType: 'Quotation',
      entityId: saved.id,
      metadata: {
        revisedFromQuotationId: existingId,
        quotationGroupId: existing.quotationGroupId,
        newVersion: nextVersion,
      },
    });

    return this.get(saved.id);
  }

  /**
   * Creates a new quotation version representing an APPROVED change request
   * on a running project. Distinct from reviseFrom() in one way: it adds a
   * single new line item for the delta rather than copying items unchanged,
   * with price computed as latestPrice + priceDeltaCents.
   *
   * Confirmed with the person (see MEMORY.md Section 04/44 update): the new
   * version is created as plain 'draft', same as any other new quotation —
   * it is NOT auto-accepted. Internally "approving" a change request only
   * records that staff have agreed the change is worth quoting; the client
   * still has to go through the normal send → accept cycle (or public
   * acceptance link) before it's real. See acceptCore() for the other half
   * of this: the project's quotation link/budget only move once THIS
   * specific version is actually accepted, not at approval time.
   *
   * Accepts an optional EntityManager so ChangeRequestService can run this
   * in the same transaction as the change request's own status update (same
   * participate-in-caller's-transaction pattern as
   * IntelligenceService.captureSnapshot).
   */
  async applyChangeRequestRevision(
    existingQuotationId: string,
    delta: { description: string; hours: number; priceDeltaCents: number },
    actingUserId: string | null,
    manager?: EntityManager,
  ): Promise<Quotation> {
    const quotationRepo = manager ? manager.getRepository(Quotation) : this.quotationRepo;
    const itemRepo = manager ? manager.getRepository(QuotationItem) : this.itemRepo;

    const existing = await quotationRepo.findOne({
      where: { id: existingQuotationId },
      relations: ['client', 'estimate', 'items'],
    });
    if (!existing) throw new NotFoundException('Quotation not found');

    const latestVersion = await quotationRepo.findOne({
      where: { quotationGroupId: existing.quotationGroupId },
      relations: ['client', 'estimate', 'items'],
      order: { version: 'DESC' },
    });
    const base = latestVersion ?? existing;

    const nextVersion = base.version + 1;
    const newPriceCents = base.priceCentsSnapshot + delta.priceDeltaCents;
    if (newPriceCents < 0) {
      throw new BadRequestException('This change would bring the quotation price below zero.');
    }

    const revised = quotationRepo.create({
      estimate: existing.estimate,
      client: existing.client,
      quotationGroupId: existing.quotationGroupId,
      version: nextVersion,
      // Draft — must go through send/accept like any other quotation.
      // See the design-choice note in the method docblock above.
      status: 'draft' as QuotationStatus,
      clientNameSnapshot: existing.clientNameSnapshot,
      titleSnapshot: existing.titleSnapshot,
      priceCentsSnapshot: newPriceCents,
      currency: existing.currency,
      // Change requests apply to running projects, which are never
      // recurring billing instances themselves — reset to plain/one-off
      // on the new version, matching reviseFrom's own reset-to-defaults
      // approach for every field not explicitly carried forward.
      recurringInterval: 'none',
      recurringSeriesId: null,
      nextBillingDate: null,
      lastReminderSentAt: null,
      acceptanceToken: null,
      acceptanceTokenExpiresAt: null,
      sentAt: null,
      respondedAt: null,
    });
    const saved = await quotationRepo.save(revised);

    const carriedItems = base.items.map((item) =>
      itemRepo.create({ quotation: saved, description: item.description, hours: item.hours }),
    );
    const deltaItem = itemRepo.create({
      quotation: saved,
      description: delta.description,
      hours: String(delta.hours),
    });
    await itemRepo.save([...carriedItems, deltaItem]);

    await this.auditLogService.record({
      userId: actingUserId,
      action: 'quotation.revised',
      entityType: 'Quotation',
      entityId: saved.id,
      metadata: {
        revisedFromQuotationId: existingQuotationId,
        quotationGroupId: existing.quotationGroupId,
        newVersion: nextVersion,
        reason: 'change_request',
        priceDeltaCents: delta.priceDeltaCents,
      },
    });

    return quotationRepo.findOne({ where: { id: saved.id }, relations: ['client', 'estimate', 'items'] }) as Promise<Quotation>;
  }

  async send(id: string, userId: string | null) {
    const quotation = await this.get(id);
    this.assertMutable(quotation);

    const token = randomBytes(24).toString('hex'); // 48 hex chars, unguessable
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ACCEPTANCE_TOKEN_TTL_DAYS);

    // Status change + acceptance token issuance + the "email" (log entry)
    // announcing it must succeed together — same KI-008-style reasoning as
    // ProjectService.updateStatus: a token issued but never logged/sent
    // would leave the client unable to act on a quotation that's already
    // marked 'sent'.
    await this.dataSource.transaction(async (manager) => {
      quotation.status = 'sent';
      quotation.sentAt = new Date();
      quotation.acceptanceToken = token;
      quotation.acceptanceTokenExpiresAt = expiresAt;
      await manager.getRepository(Quotation).save(quotation);

      if (quotation.client?.contactEmail) {
        await this.notificationsService.queueEmail(
          {
            recipientEmail: quotation.client.contactEmail,
            subject: `Quotation ready for review: ${quotation.titleSnapshot}`,
            body: this.renderAcceptanceEmailBody(quotation, token),
            relatedQuotationId: quotation.id,
          },
          manager,
        );
      }
    });

    await this.auditLogService.record({
      userId,
      action: 'quotation.sent',
      entityType: 'Quotation',
      entityId: id,
      metadata: { version: quotation.version, hasClientEmail: !!quotation.client?.contactEmail },
    });
    return this.get(id);
  }

  /**
   * Renders the plain-text body of the "email" logged for a sent
   * quotation. Contains the public acceptance link — the whole point of a
   * signed link is that the client does NOT need to log in to act on it.
   */
  private renderAcceptanceEmailBody(quotation: Quotation, token: string): string {
    const priceDisplay = formatMoney(quotation.priceCentsSnapshot, quotation.currency);
    return [
      `Hi ${quotation.clientNameSnapshot},`,
      '',
      `Your quotation "${quotation.titleSnapshot}" (v${quotation.version}) is ready for review.`,
      `Total: ${priceDisplay}`,
      '',
      `Review and respond here (no login required, link expires in ${ACCEPTANCE_TOKEN_TTL_DAYS} days):`,
      `/quote/${token}`,
    ].join('\n');
  }

  private async acceptCore(quotation: Quotation, userId: string | null, via: 'internal' | 'public-link') {
    if (quotation.status !== 'sent') {
      throw new BadRequestException('Only a sent quotation can be accepted');
    }

    await this.dataSource.transaction(async (manager) => {
      quotation.status = 'accepted';
      quotation.respondedAt = new Date();
      // The token is intentionally NOT cleared here (fixed after live testing
      // surfaced this): re-using it to accept/reject again is already blocked
      // by the status !== 'sent' check above, but the token must stay valid
      // for the client to revisit the same link and see a friendly "you
      // already accepted this" confirmation instead of "this link is invalid"
      // — see PublicQuotePage's alreadyResponded branch. The token still
      // expires naturally via acceptanceTokenExpiresAt (30-day TTL).
      if (quotation.recurringInterval !== 'none') {
        quotation.nextBillingDate = computeNextBillingDate(new Date(), quotation.recurringInterval as 'monthly' | 'quarterly');
        // A newly-set nextBillingDate starts a fresh reminder cycle — clear
        // any stale lastReminderSentAt so the new due date can be reminded on.
        quotation.lastReminderSentAt = null;
      }
      await manager.getRepository(Quotation).save(quotation);

      // If this quotation is the result of an approved change request, the
      // project it belongs to has been waiting on exactly this acceptance
      // to move forward. Confirmed with the person (MEMORY.md Section
      // 04/44 update): change-request "approve" only creates a draft — the
      // project's quotation link/budget must NOT change until the client
      // has actually accepted this specific version, same as any other
      // quotation. This is the one place that happens, inside the same
      // transaction as the acceptance itself, so a project can never end
      // up "approved but budget not updated" or vice versa.
      const linkedChangeRequest = await manager.getRepository(ChangeRequest).findOne({
        where: { resultingQuotation: { id: quotation.id }, status: 'approved' },
        relations: ['project'],
      });
      if (linkedChangeRequest) {
        const project = await manager
          .getRepository(Project)
          .findOne({ where: { id: linkedChangeRequest.project.id } });
        if (project) {
          project.quotation = quotation;
          project.budgetCentsSnapshot = quotation.priceCentsSnapshot;
          await manager.getRepository(Project).save(project);
        }
      }
    });

    await this.auditLogService.record({
      userId,
      action: 'quotation.accepted',
      entityType: 'Quotation',
      entityId: quotation.id,
      metadata: { version: quotation.version, priceCents: quotation.priceCentsSnapshot, via },
    });
    return this.get(quotation.id);
  }

  private async rejectCore(quotation: Quotation, userId: string | null, via: 'internal' | 'public-link') {
    if (quotation.status !== 'sent') {
      throw new BadRequestException('Only a sent quotation can be rejected');
    }
    quotation.status = 'rejected';
    quotation.respondedAt = new Date();
    // See the matching comment in acceptCore — token intentionally kept
    // valid so a revisit shows a friendly "already declined" confirmation.
    await this.quotationRepo.save(quotation);
    await this.auditLogService.record({
      userId,
      action: 'quotation.rejected',
      entityType: 'Quotation',
      entityId: quotation.id,
      metadata: { version: quotation.version, via },
    });
    return this.get(quotation.id);
  }

  async accept(id: string, userId: string | null) {
    const quotation = await this.get(id);
    return this.acceptCore(quotation, userId, 'internal');
  }

  async reject(id: string, userId: string | null) {
    const quotation = await this.get(id);
    return this.rejectCore(quotation, userId, 'internal');
  }

  // ---------- Phase 2 task 4: public, token-based acceptance flow ----------
  // No SessionAuthGuard on these — see PublicQuotationController. The token
  // itself IS the authorization; a valid, unexpired token proves the caller
  // received the link, not that they're a logged-in user.

  private async findByToken(token: string): Promise<Quotation> {
    const quotation = await this.quotationRepo.findOne({
      where: { acceptanceToken: token },
      relations: ['client', 'estimate', 'items'],
    });
    if (!quotation) {
      throw new NotFoundException('This link is invalid or has already been used.');
    }
    if (!quotation.acceptanceTokenExpiresAt || quotation.acceptanceTokenExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This link has expired. Please request a new quotation.');
    }
    return quotation;
  }

  /** Client-safe view for the public link — no internal cost/margin data, see Section 05. */
  async getPublicViewByToken(token: string) {
    const quotation = await this.findByToken(token);
    return this.toPublicView(quotation);
  }

  /** Projects a Quotation down to fields safe to return over the public, unauthenticated route. */
  private toPublicView(quotation: Quotation) {
    return {
      title: quotation.titleSnapshot,
      clientName: quotation.clientNameSnapshot,
      version: quotation.version,
      status: quotation.status,
      priceCents: quotation.priceCentsSnapshot,
      currency: quotation.currency,
      items: quotation.items.map((i) => ({ description: i.description, hours: i.hours })),
      sentAt: quotation.sentAt,
      respondedAt: quotation.respondedAt,
      recurringInterval: quotation.recurringInterval,
    };
  }

  async acceptByToken(token: string) {
    const quotation = await this.findByToken(token);
    const accepted = await this.acceptCore(quotation, null, 'public-link');
    return this.toPublicView(accepted);
  }

  async rejectByToken(token: string) {
    const quotation = await this.findByToken(token);
    const rejected = await this.rejectCore(quotation, null, 'public-link');
    return this.toPublicView(rejected);
  }

  async expire(id: string, userId: string | null) {
    const quotation = await this.get(id);
    if (quotation.status !== 'sent') {
      throw new BadRequestException('Only a sent quotation can expire');
    }
    quotation.status = 'expired';
    // Token intentionally kept valid (see acceptCore) — a manually-expired
    // quotation should still show "this quotation has expired" if the
    // client revisits the link, not a generic invalid-link error.
    await this.quotationRepo.save(quotation);
    await this.auditLogService.record({
      userId,
      action: 'quotation.expired',
      entityType: 'Quotation',
      entityId: id,
      metadata: { version: quotation.version },
    });
    return this.get(id);
  }

  /**
   * Manually generates the next billing instance of an accepted recurring
   * quotation. There is no background job driving this automatically — see
   * MEMORY.md KI-001: a cron-style scheduler can't survive this sandbox's
   * per-tool-call execution model, so "the next invoice is due" is
   * surfaced via nextBillingDate and acted on explicitly (by a person, or
   * by a real scheduler in a production deployment) rather than faked with
   * something that only pretends to run automatically here.
   *
   * The new instance is its own quotation lineage (own id/quotationGroupId,
   * version 1, status draft) sharing recurringSeriesId with the source —
   * it still needs to go through send/accept like any other quotation.
   */
  async generateNextRecurringInstance(sourceId: string, userId: string | null) {
    const source = await this.get(sourceId);
    if (source.recurringInterval === 'none') {
      throw new BadRequestException('This quotation is not recurring — nothing to generate.');
    }
    if (source.status !== 'accepted') {
      throw new BadRequestException('Only an accepted recurring quotation can generate its next billing instance.');
    }

    const newId = randomUUID();
    const instance = this.quotationRepo.create({
      id: newId,
      estimate: source.estimate,
      client: source.client,
      quotationGroupId: newId,
      version: 1,
      status: 'draft',
      clientNameSnapshot: source.clientNameSnapshot,
      titleSnapshot: source.titleSnapshot,
      priceCentsSnapshot: source.priceCentsSnapshot,
      currency: source.currency,
      recurringInterval: source.recurringInterval,
      recurringSeriesId: source.recurringSeriesId ?? source.id,
      nextBillingDate: null,
      lastReminderSentAt: null,
      acceptanceToken: null,
      acceptanceTokenExpiresAt: null,
      sentAt: null,
      respondedAt: null,
    });
    const saved = await this.quotationRepo.save(instance);

    const items = source.items.map((item) =>
      this.itemRepo.create({ quotation: saved, description: item.description, hours: item.hours }),
    );
    await this.itemRepo.save(items);

    // The source's own nextBillingDate is cleared once its instance has
    // been generated — it gets a fresh one only when THIS new instance is
    // itself accepted, not on a fixed automatic cadence (see note above).
    // Its reminder flag is cleared alongside it — the cycle it was sent for
    // is now closed, so it should never read as "still pending" again.
    source.nextBillingDate = null;
    source.lastReminderSentAt = null;
    await this.quotationRepo.save(source);

    await this.auditLogService.record({
      userId,
      action: 'quotation.recurring_instance_generated',
      entityType: 'Quotation',
      entityId: saved.id,
      metadata: { sourceQuotationId: source.id, recurringSeriesId: instance.recurringSeriesId },
    });

    return this.get(saved.id);
  }

  /**
   * Recurring quotations that are accepted and whose nextBillingDate has
   * arrived (or passed). Read-only surfacing of "these are due" — nothing
   * here sends anything; see sendBillingReminder for the explicit action.
   * No automatic scheduler drives this list (see MEMORY.md KI-001), so it's
   * meant to be checked from the Due for Billing panel, not polled by a job.
   */
  async listDueForBilling() {
    const today = new Date().toISOString().slice(0, 10);
    return this.quotationRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.client', 'client')
      .where('q.recurringInterval != :none', { none: 'none' })
      .andWhere('q.status = :status', { status: 'accepted' })
      .andWhere('q.nextBillingDate IS NOT NULL')
      .andWhere('q.nextBillingDate <= :today', { today })
      .orderBy('q.nextBillingDate', 'ASC')
      .getMany();
  }

  /**
   * Queues a reminder email for a due recurring quotation (log-only — see
   * NotificationsService) and marks it reminded for the current billing
   * cycle. Duplicate-safe: rejects a second reminder for the same
   * nextBillingDate until that date changes (cleared by
   * generateNextRecurringInstance, or replaced by the next acceptCore
   * cycle) — see the lastReminderSentAt reset points in this file.
   */
  async sendBillingReminder(id: string, userId: string | null) {
    const quotation = await this.get(id);
    if (quotation.recurringInterval === 'none') {
      throw new BadRequestException('This quotation is not recurring — there is no billing reminder to send.');
    }
    if (quotation.status !== 'accepted') {
      throw new BadRequestException('Only an accepted recurring quotation can have a billing reminder sent.');
    }
    if (!quotation.nextBillingDate) {
      throw new BadRequestException('This quotation has no upcoming billing date due.');
    }
    if (quotation.lastReminderSentAt) {
      throw new BadRequestException('A reminder has already been sent for this billing date.');
    }

    if (quotation.client?.contactEmail) {
      await this.notificationsService.queueEmail({
        recipientEmail: quotation.client.contactEmail,
        subject: `Upcoming billing: ${quotation.titleSnapshot}`,
        body: this.renderBillingReminderBody(quotation),
        relatedQuotationId: quotation.id,
      });
    }

    quotation.lastReminderSentAt = new Date();
    await this.quotationRepo.save(quotation);

    await this.auditLogService.record({
      userId,
      action: 'quotation.billing_reminder_sent',
      entityType: 'Quotation',
      entityId: quotation.id,
      metadata: {
        nextBillingDate: quotation.nextBillingDate,
        hasClientEmail: !!quotation.client?.contactEmail,
      },
    });

    return this.get(id);
  }

  /** Plain-text body for a queued billing-reminder email — see sendBillingReminder. */
  private renderBillingReminderBody(quotation: Quotation): string {
    const priceDisplay = formatMoney(quotation.priceCentsSnapshot, quotation.currency);
    return [
      `Hi ${quotation.clientNameSnapshot},`,
      '',
      `This is a reminder that your ${quotation.recurringInterval} billing for "${quotation.titleSnapshot}" is due on ${quotation.nextBillingDate}.`,
      `Amount: ${priceDisplay}`,
      '',
      'No action is needed from you — this is an informational reminder.',
    ].join('\n');
  }

  /**
   * Renders the quotation to a PDF buffer via Puppeteer, using renderHtml()
   * so the same client-safe-only content rules apply to both HTML and PDF
   * output. See MEMORY.md ADR-011 for why the executable path is resolved
   * explicitly rather than relying on Puppeteer's default download location
   * in this sandbox.
   */
  async generatePdf(quotation: Quotation): Promise<Buffer> {
    const executablePath = resolveChromeExecutable();
    if (!executablePath) {
      throw new BadRequestException(
        'PDF generation is unavailable: no Chrome/Chromium executable found in this environment.',
      );
    }

    const orgSettings = await this.orgSettingsService.get();

    // Loaded lazily (not as a top-level import) because puppeteer ships an
    // ESM entrypoint that breaks ts-jest's CJS-based static parsing of this
    // file in unit tests, which never call this method anyway (mocked).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const puppeteer = require('puppeteer');

    const browser = await puppeteer.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(this.renderHtml(quotation, orgSettings), { waitUntil: 'load' });
      const pdfUint8 = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdfUint8);
    } finally {
      await browser.close();
    }
  }

  /**
   * Renders the client-facing quotation as HTML for PDF generation.
   * CRITICAL: only client-safe fields are used here — no cost, margin,
   * multiplier, or internal estimate data. See MEMORY.md Section 05.
   *
   * `orgSettings` is optional and defaults to a blank/generic identity when
   * omitted — this keeps every existing call site and unit test that calls
   * renderHtml(quotation) with a single argument working unchanged; only
   * generatePdf() (which is async and already fetches real data) passes it.
   */
  renderHtml(quotation: Quotation, orgSettings?: OrgSettings): string {
    const priceDisplay = formatMoney(quotation.priceCentsSnapshot, quotation.currency);
    const dateDisplay = quotation.sentAt ? new Date(quotation.sentAt).toLocaleDateString() : new Date().toLocaleDateString();

    const rows = quotation.items
      .map(
        (item) =>
          `<tr class="item-row">
            <td class="desc-col">${escapeHtml(item.description)}</td>
            <td class="hours-col">${item.hours}h</td>
          </tr>`,
      )
      .join('');

    const orgName = orgSettings?.name ? escapeHtml(orgSettings.name) : 'Your Agency';
    const logoHtml = orgSettings?.logoUrl
      ? `<img src="${escapeHtml(orgSettings.logoUrl)}" alt="${orgName}" class="logo" />`
      : `<div class="logo-text">${orgName}</div>`;
      
    const addressLines = [orgSettings?.addressLine1, orgSettings?.addressLine2]
      .filter((line): line is string => !!line)
      .map((line) => escapeHtml(line))
      .join('<br/>');
      
    const contactLine = [orgSettings?.contactEmail, orgSettings?.contactPhone]
      .filter((value): value is string => !!value)
      .map((value) => escapeHtml(value))
      .join(' | ');

    const footerHtml = orgSettings?.quotationFooterText
      ? `<div class="footer-terms">${escapeHtml(orgSettings.quotationFooterText)}</div>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quotation</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      color: #1f2937;
      padding: 50px;
      margin: 0;
      background-color: #ffffff;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 2px solid #e5e7eb;
    }
    .company-info {
      max-width: 50%;
    }
    .logo {
      max-height: 50px;
      max-width: 200px;
      margin-bottom: 15px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 10px;
      letter-spacing: -0.5px;
    }
    .agency-details {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.6;
    }
    .quote-meta {
      text-align: right;
    }
    .quote-badge {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 6px 12px;
      border-radius: 4px;
      margin-bottom: 15px;
    }
    .quote-title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 5px 0;
      letter-spacing: -0.5px;
    }
    .quote-date {
      font-size: 13px;
      color: #6b7280;
      margin: 0;
    }
    .client-section {
      margin-bottom: 40px;
    }
    .client-label {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .client-name {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
    }
    .items-table th {
      text-align: left;
      padding: 12px 16px;
      background-color: #f9fafb;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }
    .items-table th.hours-col {
      text-align: right;
      width: 120px;
    }
    .item-row td {
      padding: 16px;
      font-size: 14px;
      color: #1f2937;
      border-bottom: 1px solid #e5e7eb;
    }
    .item-row td.hours-col {
      text-align: right;
      font-weight: 500;
      color: #4b5563;
    }
    .item-row:nth-child(even) {
      background-color: #fcfcfd;
    }
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 60px;
    }
    .total-box {
      background-color: #f3f4f6;
      padding: 24px 32px;
      border-radius: 8px;
      min-width: 250px;
    }
    .total-label {
      font-size: 14px;
      color: #4b5563;
      margin-bottom: 8px;
    }
    .total-amount {
      font-size: 32px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      letter-spacing: -1px;
    }
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 30px;
      margin-top: auto;
    }
    .footer-terms {
      font-size: 12px;
      color: #6b7280;
      white-space: pre-wrap;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      ${logoHtml}
      <div class="agency-details">
        ${addressLines ? `<div>${addressLines}</div>` : ''}
        ${contactLine ? `<div style="margin-top: 8px;">${contactLine}</div>` : ''}
      </div>
    </div>
    <div class="quote-meta">
      <div class="quote-badge">Quotation v${quotation.version}</div>
      <h1 class="quote-title">${escapeHtml(quotation.titleSnapshot)}</h1>
      <p class="quote-date">Date: ${dateDisplay}</p>
    </div>
  </div>

  <div class="client-section">
    <div class="client-label">Prepared For</div>
    <h2 class="client-name">${escapeHtml(quotation.clientNameSnapshot)}</h2>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th class="desc-col">Description</th>
        <th class="hours-col">Estimated Hours</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="summary-section">
    <div class="total-box">
      <div class="total-label">Total Estimate</div>
      <div class="total-amount">${priceDisplay}</div>
    </div>
  </div>

  ${footerHtml ? `<div class="footer">${footerHtml}</div>` : ''}
</body>
</html>`;
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Formats integer cents as a localized currency string for the given ISO 4217 code. Falls back to USD if unset. */
function formatMoney(cents: number, currency: string): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: currency || 'USD' });
}

/** Returns an ISO date string (YYYY-MM-DD) one interval past `from`. */
function computeNextBillingDate(from: Date, interval: 'monthly' | 'quarterly'): string {
  const next = new Date(from);
  next.setMonth(next.getMonth() + (interval === 'monthly' ? 1 : 3));
  return next.toISOString().slice(0, 10);
}

/**
 * Finds a usable Chrome/Chromium executable. Puppeteer's own
 * executablePath() assumes a specific cache layout that this sandbox's
 * puppeteer install did not populate reliably (see MEMORY.md ADR-011), so
 * we fall back to scanning common cache locations for a real binary.
 */
function resolveChromeExecutable(): string | null {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    ...globSync('/home/*/.cache/puppeteer/chrome/*/chrome-linux64/chrome'),
    ...globSync('/root/.cache/puppeteer/chrome/*/chrome-linux64/chrome'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter((p): p is string => !!p);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function globSync(pattern: string): string[] {
  // Minimal single-wildcard glob (no external dep) — pattern has exactly one '*' path segment.
  const starIndex = pattern.indexOf('*');
  if (starIndex === -1) return fs.existsSync(pattern) ? [pattern] : [];

  const before = pattern.slice(0, starIndex);
  const after = pattern.slice(starIndex + 1);
  const dir = before.slice(0, before.lastIndexOf('/'));
  const prefix = before.slice(before.lastIndexOf('/') + 1);

  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir);
  return entries
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => `${dir}/${entry}${after}`)
    .filter((full) => fs.existsSync(full));
}
