import { MigrationInterface, QueryRunner } from 'typeorm';

// Pending item from MEMORY.md Section 04/33 follow-ups — `nextBillingDate`
// existed since Phase 2 task 4 (recurring quotations) but nothing surfaced
// when a billing instance was actually due. This adds the one column needed
// to make reminders duplicate-safe: `lastReminderSentAt` records the moment
// a reminder was sent FOR THE CURRENTLY-SET `nextBillingDate`. It is reset
// to null every time `nextBillingDate` itself is (re)computed or cleared
// (see QuotationService: acceptCore, generateNextRecurringInstance, generate,
// reviseFrom) — so "a reminder is already pending for this cycle" is always
// answerable with a single null-check, no separate cycle-id needed.
export class BillingReminders1700000600000 implements MigrationInterface {
  name = 'BillingReminders1700000600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quotations"
      ADD COLUMN "lastReminderSentAt" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quotations" DROP COLUMN IF EXISTS "lastReminderSentAt"`);
  }
}
