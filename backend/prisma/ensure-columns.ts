/**
 * Idempotent schema fixes for production DBs that drifted from Prisma migrations.
 * Safe to run on every Render build.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const statements = [
    `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "mentor_locked_at" TIMESTAMP(3)`,
    // Dual-role accounts (20261001000000): secondary roles live in an enum array.
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "additional_roles" "PlatformRole"[] NOT NULL DEFAULT '{}'`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "deliverables" ADD COLUMN IF NOT EXISTS "ppt_file_name" TEXT`,
    `ALTER TABLE "deliverables" ADD COLUMN IF NOT EXISTS "report_file_name" TEXT`,
    // Mentor LinkedIn link (20261004120000). The backfill from profileJson lives in
    // that migration; this only keeps the column itself present on drifted DBs.
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "linkedin_url" TEXT`,
    // Actionable notifications (mirrors migrations/20261006120000_notification_actions). The Prisma client
    // selects these columns on every notification query, so they MUST exist or the bell fails with P2022.
    `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "action_kind" TEXT`,
    `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "action_ref" TEXT`,
    `CREATE INDEX IF NOT EXISTS "notifications_user_id_action_kind_idx" ON "notifications"("user_id", "action_kind")`,
    // Partial unique index — one pending join request per student per team.
    // Prisma's db push cannot create partial indexes, so it lives here (and in
    // prisma/migrations/20260919000000_add_join_requests/migration.sql).
    `CREATE UNIQUE INDEX IF NOT EXISTS "join_requests_one_pending_idx" ON "join_requests"("student_id", "team_id") WHERE "status" = 'pending'`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('[ensure-columns] ok:', sql);
    } catch (err) {
      console.error('[ensure-columns] failed:', sql, err);
      throw err;
    }
  }

  // Enum values that Prisma's `db push` cannot add inside a transaction.
  const rawStatements = [
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'team_join_request'`,
    `ALTER TYPE "PlatformRole" ADD VALUE IF NOT EXISTS 'student_expert'`,
  ];
  for (const sql of rawStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('[ensure-columns] ok:', sql);
    } catch (err) {
      console.warn('[ensure-columns] skipped:', sql, err && err.message ? err.message : err);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
