import { MigrationInterface, QueryRunner } from 'typeorm';

// Org-level config/branding — a genuinely new area, not a follow-up on an
// existing table (contrast with BillingReminders, which added one column
// to an existing entity). Schema-only migration; the singleton row itself
// is lazily created by OrgSettingsService.get() on first access, not
// seeded here, consistent with how this project keeps migrations
// schema-only and data-seeding in src/seed*.ts / service-level defaults.
export class OrgSettings1700000700000 implements MigrationInterface {
  name = 'OrgSettings1700000700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "organization_settings" (
        "id" uuid PRIMARY KEY,
        "name" varchar(150) NOT NULL,
        "logoUrl" varchar(500),
        "addressLine1" varchar(200),
        "addressLine2" varchar(200),
        "contactEmail" varchar(255),
        "contactPhone" varchar(40),
        "defaultCurrency" varchar(3) NOT NULL DEFAULT 'USD',
        "quotationFooterText" text,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_settings"`);
  }
}
