import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Singleton row: exactly one organization exists in this single-tenant MVP
// (see MEMORY.md Section 01 — "MVP is single-tenant"), so there is
// deliberately no CreateDto/create() path here, no list endpoint, and no
// auto-generated id. `id` is fixed to SINGLETON_ID so the row is trivially
// upsertable and callers never need to know/pass an id.
export const ORG_SETTINGS_SINGLETON_ID = '00000000-0000-0000-0000-000000000001';

@Entity('organization_settings')
export class OrgSettings {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  // A URL to an already-hosted image, not a file upload — consistent with
  // this project's scope discipline elsewhere (no binary storage layer
  // exists in this system). Validated as a URL at the DTO layer.
  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  addressLine1: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  addressLine2: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  contactPhone: string | null;

  // ISO 4217 code, same allow-list as PricingProfile/Quotation currency
  // (SUPPORTED_CURRENCIES in pricing.dto.ts) — this is only ever a
  // *default* pre-fill for new pricing profiles, never itself converted
  // or enforced on existing quotations.
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  defaultCurrency: string;

  // Free text shown at the bottom of client-facing quotation PDFs (e.g.
  // payment terms, a thank-you note, legal boilerplate). Optional.
  @Column({ type: 'text', nullable: true })
  quotationFooterText: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
