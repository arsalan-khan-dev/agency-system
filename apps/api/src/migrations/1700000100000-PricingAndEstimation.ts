import { MigrationInterface, QueryRunner } from 'typeorm';

export class PricingAndEstimation1700000100000 implements MigrationInterface {
  name = 'PricingAndEstimation1700000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pricing_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "description" text,
        "baseHourlyRateCents" integer NOT NULL,
        "minimumPriceCents" integer NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pricing_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "profile_id" uuid NOT NULL REFERENCES "pricing_profiles"("id"),
        "ruleType" varchar(20) NOT NULL,
        "key" varchar(50) NOT NULL,
        "label" varchar(100) NOT NULL,
        "multiplier" numeric(6,3) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_pricing_rule" UNIQUE ("profile_id", "ruleType", "key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "estimation_questions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_type_id" uuid NOT NULL REFERENCES "project_types"("id"),
        "prompt" text NOT NULL,
        "answerType" varchar(20) NOT NULL,
        "options" jsonb NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "estimates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(200) NOT NULL,
        "project_type_id" uuid NOT NULL REFERENCES "project_types"("id"),
        "pricing_profile_id" uuid NOT NULL REFERENCES "pricing_profiles"("id"),
        "complexityKey" varchar(50) NOT NULL,
        "urgencyKey" varchar(50) NOT NULL,
        "totalHoursSnapshot" numeric(8,2) NOT NULL,
        "baseCostCentsSnapshot" integer NOT NULL,
        "complexityMultiplierSnapshot" numeric(6,3) NOT NULL,
        "urgencyMultiplierSnapshot" numeric(6,3) NOT NULL,
        "calculatedPriceCents" integer NOT NULL,
        "manualAdjustedPriceCents" integer,
        "adjustmentJustification" text,
        "finalPriceCents" integer NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "created_by_user_id" uuid REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "estimate_features" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "estimate_id" uuid NOT NULL REFERENCES "estimates"("id") ON DELETE CASCADE,
        "feature_id" uuid NOT NULL REFERENCES "features"("id"),
        "featureNameSnapshot" varchar(150) NOT NULL,
        "baselineHoursSnapshot" numeric(8,2) NOT NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_pricing_rules_profile" ON "pricing_rules" ("profile_id")`);
    await queryRunner.query(`CREATE INDEX "idx_estimation_questions_pt" ON "estimation_questions" ("project_type_id")`);
    await queryRunner.query(`CREATE INDEX "idx_estimates_project_type" ON "estimates" ("project_type_id")`);
    await queryRunner.query(`CREATE INDEX "idx_estimates_status" ON "estimates" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_estimate_features_estimate" ON "estimate_features" ("estimate_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "estimate_features"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "estimates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "estimation_questions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pricing_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pricing_profiles"`);
  }
}
