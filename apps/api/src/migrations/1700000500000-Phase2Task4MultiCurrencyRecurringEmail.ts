import { MigrationInterface, QueryRunner } from 'typeorm';

// Phase 2 task 4 (MEMORY.md Section 19) — four features, scoped explicitly
// with the person before writing any code:
//  1. Multi-currency: full, no conversion. PricingProfile carries its own
//     currency; Quotation snapshots it at generation time (same snapshot
//     pattern as priceCentsSnapshot — see ADR-005).
//  2. Signed acceptance links: tokenized public URL, no login required.
//  3. Recurring quotations: same estimate, billed on an interval, no usage
//     tracking. No real cron in this sandbox (see MEMORY.md KI-001) — next
//     billing instance is generated via an explicit manual trigger, not a
//     background job that can't survive this environment anyway.
//  4. Email delivery: logged/queued only, no real SMTP — explicitly scoped
//     that way with the person; real sending is a production-environment
//     concern (needs real credentials) deferred out of this sandbox.
export class Phase2Task4MultiCurrencyRecurringEmail1700000500000 implements MigrationInterface {
  name = 'Phase2Task4MultiCurrencyRecurringEmail1700000500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pricing_profiles"
      ADD COLUMN "currency" varchar(3) NOT NULL DEFAULT 'USD'
    `);

    await queryRunner.query(`
      ALTER TABLE "quotations"
      ADD COLUMN "currency" varchar(3) NOT NULL DEFAULT 'USD',
      ADD COLUMN "acceptanceToken" varchar(64),
      ADD COLUMN "acceptanceTokenExpiresAt" timestamptz,
      ADD COLUMN "recurringInterval" varchar(20) NOT NULL DEFAULT 'none',
      ADD COLUMN "nextBillingDate" date,
      ADD COLUMN "recurringSeriesId" uuid
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_quotations_acceptance_token" ON "quotations" ("acceptanceToken") WHERE "acceptanceToken" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_quotations_recurring_series" ON "quotations" ("recurringSeriesId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "email_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "recipientEmail" varchar(255) NOT NULL,
        "subject" varchar(255) NOT NULL,
        "body" text NOT NULL,
        "relatedQuotationId" uuid REFERENCES "quotations"("id") ON DELETE SET NULL,
        "status" varchar(20) NOT NULL DEFAULT 'queued',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_email_logs_related_quotation" ON "email_logs" ("relatedQuotationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "email_logs"`);
    await queryRunner.query(`ALTER TABLE "quotations"
      DROP COLUMN IF EXISTS "currency",
      DROP COLUMN IF EXISTS "acceptanceToken",
      DROP COLUMN IF EXISTS "acceptanceTokenExpiresAt",
      DROP COLUMN IF EXISTS "recurringInterval",
      DROP COLUMN IF EXISTS "nextBillingDate",
      DROP COLUMN IF EXISTS "recurringSeriesId"
    `);
    await queryRunner.query(`ALTER TABLE "pricing_profiles" DROP COLUMN IF EXISTS "currency"`);
  }
}
