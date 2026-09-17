/**
 * Idempotent schema fixes for production DBs that drifted from Prisma migrations.
 * Plain CommonJS so Render can run it with `node` (tsx may be a skipped devDependency).
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const statements = [
    `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "mentor_locked_at" TIMESTAMP(3)`,
    `CREATE INDEX IF NOT EXISTS "team_members_invited_email_invite_status_idx" ON "team_members" ("invited_email", "invite_status")`,
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

  // Rename legacy enum value draft → saved (runs before prisma db push).
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "PsPreferenceStatus" RENAME VALUE 'draft' TO 'saved'`);
    console.log('[ensure-columns] ok: renamed draft → saved');
  } catch {
    // Value may not exist if already renamed or first boot — saved below.
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "PsPreferenceStatus" ADD VALUE IF NOT EXISTS 'saved'`);
    console.log('[ensure-columns] ok: saved enum value ensured');
  } catch {
    // Fresh DB handled by prisma db push — safe to skip.
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "ImportBatchStatus" ADD VALUE IF NOT EXISTS 'processing'`);
    console.log('[ensure-columns] ok: ImportBatchStatus.processing');
  } catch (err) {
    console.warn('[ensure-columns] ImportBatchStatus.processing skipped:', err && err.message ? err.message : err);
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
