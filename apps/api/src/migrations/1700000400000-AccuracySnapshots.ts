import { MigrationInterface, QueryRunner } from 'typeorm';

// Phase 2 — Historical Intelligence (MEMORY.md Section 19, task 1).
// One row per project, written once when the project transitions to
// `completed` (see ProjectService.updateStatus). Persisted rather than
// recomputed live so accuracy trends can be queried over time without
// re-deriving them from actuals/expenses on every dashboard load.
export class AccuracySnapshots1700000400000 implements MigrationInterface {
  name = 'AccuracySnapshots1700000400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "accuracy_snapshots" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "estimatedHours" numeric(8,2) NOT NULL,
        "actualHours" numeric(8,2) NOT NULL,
        "hoursVariance" numeric(8,2) NOT NULL,
        "hoursVariancePct" numeric(8,4) NOT NULL,
        "budgetCents" integer NOT NULL,
        "actualCostCents" integer NOT NULL,
        "costVarianceCents" integer NOT NULL,
        "costVariancePct" numeric(8,4) NOT NULL,
        "projectTypeNameSnapshot" varchar(150) NOT NULL,
        "captured_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_accuracy_snapshot_project" UNIQUE ("project_id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_accuracy_snapshots_project" ON "accuracy_snapshots" ("project_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "accuracy_snapshots"`);
  }
}
