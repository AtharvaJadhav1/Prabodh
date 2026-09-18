/**
 * Idempotent schema fixes for production DBs that drifted from Prisma migrations.
 * Safe to run on every Render build.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const statements = [
    `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "mentor_locked_at" TIMESTAMP(3)`,
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
