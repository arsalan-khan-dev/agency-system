import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectsAndFinancials1700000300000 implements MigrationInterface {
  name = 'ProjectsAndFinancials1700000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "quotation_id" uuid NOT NULL REFERENCES "quotations"("id"),
        "client_id" uuid NOT NULL REFERENCES "clients"("id"),
        "title" varchar(200) NOT NULL,
        "budgetCentsSnapshot" integer NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "startedAt" timestamptz NOT NULL,
        "completedAt" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_project_quotation" UNIQUE ("quotation_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "project_actuals" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "description" varchar(200) NOT NULL,
        "hoursLogged" numeric(8,2) NOT NULL,
        "logged_by_user_id" uuid REFERENCES "users"("id"),
        "loggedAt" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "expenses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "description" varchar(200) NOT NULL,
        "amountCents" integer NOT NULL,
        "incurredAt" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_projects_quotation" ON "projects" ("quotation_id")`);
    await queryRunner.query(`CREATE INDEX "idx_projects_client" ON "projects" ("client_id")`);
    await queryRunner.query(`CREATE INDEX "idx_projects_status" ON "projects" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_project_actuals_project" ON "project_actuals" ("project_id")`);
    await queryRunner.query(`CREATE INDEX "idx_expenses_project" ON "expenses" ("project_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "expenses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_actuals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
  }
}
