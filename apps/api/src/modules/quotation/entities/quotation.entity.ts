import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Estimate } from '../../estimation/entities/estimate.entity';
import { Client } from '../../client/entities/client.entity';
import { QuotationItem } from './quotation-item.entity';

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type RecurringInterval = 'none' | 'monthly' | 'quarterly';

// A quotation is a SNAPSHOT of an estimate at the moment it was generated,
// attached to a client. Once status moves to 'sent' or beyond, this row is
// immutable — any requested change must create a new Quotation row with an
// incremented version, never mutate this one. See MEMORY.md Section 05
// (Business rules) and ADR-005.
@Entity('quotations')
export class Quotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Estimate, { nullable: false })
  @JoinColumn({ name: 'estimate_id' })
  estimate: Estimate;

  @ManyToOne(() => Client, { nullable: false })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  // Groups all versions of "the same quotation" together. v1's own id is
  // reused as the group key for simplicity (v1.quotationGroupId = v1.id).
  @Column({ type: 'uuid' })
  quotationGroupId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: QuotationStatus;

  // --- Snapshot of everything a client would see, taken at generation time ---
  @Column({ type: 'varchar', length: 200 })
  clientNameSnapshot: string;

  @Column({ type: 'varchar', length: 200 })
  titleSnapshot: string;

  // The ONLY price field on a quotation. Internal cost/margin data
  // (baseCostCentsSnapshot, multipliers, etc. from the Estimate) is
  // deliberately NOT copied here — see MEMORY.md Section 05: "Internal
  // cost/margin data must never appear in client PDFs."
  @Column({ type: 'integer' })
  priceCentsSnapshot: number;

  // Phase 2 task 4 — snapshotted from the estimate's pricing profile at
  // generation time, same pattern as priceCentsSnapshot itself (ADR-005):
  // the currency a quotation was quoted in must never silently change if
  // the pricing profile's currency is edited later.
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @OneToMany(() => QuotationItem, (item) => item.quotation, { cascade: true })
  items: QuotationItem[];

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  // --- Phase 2 task 4: signed acceptance links (tokenized, no login) ---
  // Generated when the quotation is sent; null before then and after
  // accept/reject (the token is single-purpose — see QuotationService).
  @Column({ type: 'varchar', length: 64, nullable: true })
  acceptanceToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  acceptanceTokenExpiresAt: Date | null;

  // --- Phase 2 task 4: recurring quotations (same estimate, billed on an
  // interval, no usage tracking — explicitly scoped this way with the
  // person). 'none' for one-off quotations, which is the vast majority. ---
  @Column({ type: 'varchar', length: 20, default: 'none' })
  recurringInterval: RecurringInterval;

  // Set when an accepted recurring quotation is due for its next instance.
  // No cron job generates instances automatically in this sandbox (see
  // MEMORY.md KI-001) — this date drives a manual "generate next instance"
  // action instead.
  @Column({ type: 'date', nullable: true })
  nextBillingDate: string | null;

  // Links all billing instances of the same recurring quotation together.
  // Distinct from quotationGroupId, which links VERSIONS of one negotiated
  // quotation (see reviseFrom) — a recurring series instead links separate
  // quotation rows (each with their own quotationGroupId/version=1) that
  // represent successive billing periods of the same accepted agreement.
  @Column({ type: 'uuid', nullable: true })
  recurringSeriesId: string | null;

  // Billing reminders (follow-up to Phase 2 task 4's recurring quotations).
  // Set when a reminder email is queued for the CURRENTLY-SET
  // nextBillingDate; reset to null whenever nextBillingDate is itself
  // (re)computed or cleared, so "already reminded for this cycle" is a
  // single null-check in QuotationService.sendBillingReminder — no separate
  // cycle id needed. No cron drives this (see MEMORY.md KI-001); a person
  // triggers it from the Due for Billing list once a date has passed.
  @Column({ type: 'timestamptz', nullable: true })
  lastReminderSentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
