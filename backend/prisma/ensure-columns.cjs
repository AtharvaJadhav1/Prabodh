/**
 * Idempotent schema fixes for production DBs that drifted from Prisma migrations.
 * Plain CommonJS so Render can run it with `node` (tsx may be a skipped devDependency).
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const statements = [
    `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "mentor_locked_at" TIMESTAMP(3)`,
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

  // Prefer submitted over legacy draft if any rows were written with that enum value.
  try {
    const updated = await prisma.$executeRawUnsafe(`
      UPDATE "team_ps_preferences"
      SET "status" = 'submitted'
      WHERE "status"::text = 'draft'
    `);
    console.log('[ensure-columns] remapped draft preferences:', updated);
  } catch (err) {
    // Table or enum may not exist yet on first boot — db push handles creation.
    console.warn('[ensure-columns] preference remap skipped:', err && err.message ? err.message : err);
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
