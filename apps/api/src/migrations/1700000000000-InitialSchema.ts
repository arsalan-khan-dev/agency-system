import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(32) NOT NULL UNIQUE,
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL UNIQUE,
        "fullName" varchar(255) NOT NULL,
        "passwordHash" varchar(255) NOT NULL,
        "role_id" uuid NOT NULL REFERENCES "roles"("id"),
        "isActive" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid,
        "action" varchar(100) NOT NULL,
        "entityType" varchar(100),
        "entityId" varchar(100),
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "service_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "description" text,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "services" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "category_id" uuid NOT NULL REFERENCES "service_categories"("id"),
        "name" varchar(150) NOT NULL,
        "description" text,
        "baseUnitCostCents" integer NOT NULL DEFAULT 0,
        "unit" varchar(20) NOT NULL DEFAULT 'hour',
        "isActive" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "project_types" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "description" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "features" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_type_id" uuid NOT NULL REFERENCES "project_types"("id"),
        "name" varchar(150) NOT NULL,
        "description" text,
        "baselineHours" numeric(8,2) NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_services_category" ON "services" ("category_id")`);
    await queryRunner.query(`CREATE INDEX "idx_features_project_type" ON "features" ("project_type_id")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_logs_user" ON "audit_logs" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "features"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_types"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "services"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }
}
