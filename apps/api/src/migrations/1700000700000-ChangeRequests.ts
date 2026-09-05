import { MigrationInterface, QueryRunner } from 'typeorm';

// Change Request / Scope Mgmt module — see MEMORY.md Section 04/19 ("New
// quotation version on change") and the design-choice comment on the
// ChangeRequest entity for how approval maps onto the existing
// quotation-versioning pattern (ADR-005).
export class ChangeRequests1700000700000 implements MigrationInterface {
  name = 'ChangeRequests1700000700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "change_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "title" varchar(200) NOT NULL,
        "description" text NOT NULL,
        "hoursDelta" numeric(8,2) NOT NULL,
        "priceDeltaCents" integer NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "requested_by_user_id" uuid REFERENCES "users"("id"),
        "resolved_by_user_id" uuid REFERENCES "users"("id"),
        "resulting_quotation_id" uuid REFERENCES "quotations"("id"),
        "resolvedAt" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_change_requests_project" ON "change_requests" ("project_id")`);
    await queryRunner.query(`CREATE INDEX "idx_change_requests_status" ON "change_requests" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "change_requests"`);
  }
}
