import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClientAndQuotation1700000200000 implements MigrationInterface {
  name = 'ClientAndQuotation1700000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "clients" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(200) NOT NULL,
        "contactEmail" varchar(255),
        "contactName" varchar(200),
        "isActive" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "quotations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "estimate_id" uuid NOT NULL REFERENCES "estimates"("id"),
        "client_id" uuid NOT NULL REFERENCES "clients"("id"),
        "quotationGroupId" uuid NOT NULL,
        "version" integer NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "clientNameSnapshot" varchar(200) NOT NULL,
        "titleSnapshot" varchar(200) NOT NULL,
        "priceCentsSnapshot" integer NOT NULL,
        "sentAt" timestamptz,
        "respondedAt" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "quotation_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "quotation_id" uuid NOT NULL REFERENCES "quotations"("id") ON DELETE CASCADE,
        "description" varchar(150) NOT NULL,
        "hours" numeric(8,2) NOT NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_quotations_estimate" ON "quotations" ("estimate_id")`);
    await queryRunner.query(`CREATE INDEX "idx_quotations_client" ON "quotations" ("client_id")`);
    await queryRunner.query(`CREATE INDEX "idx_quotations_group" ON "quotations" ("quotationGroupId")`);
    await queryRunner.query(`CREATE INDEX "idx_quotations_status" ON "quotations" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_quotation_items_quotation" ON "quotation_items" ("quotation_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "quotation_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quotations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clients"`);
  }
}
