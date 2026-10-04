/**
 * Idempotent schema fixes for production DBs that drifted from Prisma migrations.
 * Plain CommonJS so Render can run it with `node` (tsx may be a skipped devDependency).
 */
// Azure app settings are typed by hand and often case-mismatched (e.g. `Database_Url`).
// main.ts normalizes this via env-compat.ts, but this script runs as its own process
// before main.ts ever starts, so it must load the same normalization itself or it
// never sees DATABASE_URL at all. The compiled file exists by the time this runs —
// `npm run compile` (tsc) always finishes before this script is invoked in production.
try {
  require('../dist/lib/env-compat.js');
} catch (err) {
  console.warn('[ensure-columns] env-compat not found (dist not built yet?):', err && err.message ? err.message : err);
}

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/** Must run before user registration — old DBs still require dropped Clerk columns. */
async function removeClerkLegacyColumns() {
  const statements = [
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" TEXT`,
    // Drop NOT NULL first: this is pure metadata and can't fail the way DROP COLUMN
    // can (dependent views/permissions), so it unblocks inserts even if the DROP
    // COLUMN statements below keep failing for some other reason.
    `ALTER TABLE "users" ALTER COLUMN "clerk_user_id" DROP NOT NULL`,
    `ALTER TABLE "teams" ALTER COLUMN "clerk_org_id" DROP NOT NULL`,
    `ALTER TABLE "team_members" DROP COLUMN IF EXISTS "clerk_invitation_id"`,
    `DROP INDEX IF EXISTS "teams_clerk_org_id_key"`,
    `ALTER TABLE "teams" DROP COLUMN IF EXISTS "clerk_org_id"`,
    `DROP INDEX IF EXISTS "users_clerk_user_id_key"`,
    `ALTER TABLE "users" DROP COLUMN IF EXISTS "clerk_user_id"`,
  ];
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('[ensure-columns] ok:', sql);
    } catch (err) {
      const detail = err && (err.meta?.message || err.message || String(err));
      console.warn('[ensure-columns] clerk/password step failed (continuing):', sql, detail);
    }
  }
}

async function main() {
  try {
    const dbUrl = new URL(process.env.DATABASE_URL || '');
    console.log('[ensure-columns] targeting database:', dbUrl.hostname + dbUrl.pathname);
  } catch {
    console.warn('[ensure-columns] DATABASE_URL is missing or not a valid URL');
  }

  await removeClerkLegacyColumns();

  const statements = [
    `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "mentor_locked_at" TIMESTAMP(3)`,
    `CREATE INDEX IF NOT EXISTS "team_members_invited_email_invite_status_idx" ON "team_members" ("invited_email", "invite_status")`,
    // Partial unique index — one pending join request per student per team.
    // Prisma's db push cannot create partial indexes, so it lives here (and in
    // prisma/migrations/20260919000000_add_join_requests/migration.sql).
    `CREATE UNIQUE INDEX IF NOT EXISTS "join_requests_one_pending_idx" ON "join_requests"("student_id", "team_id") WHERE "status" = 'pending'`,
    // Industrial mentors community table + team pointer columns (runs before db push).
    `CREATE TABLE IF NOT EXISTS "industrial_mentors" ("id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "full_name" TEXT NOT NULL, "email" TEXT NOT NULL, "phone" TEXT, "company_name" TEXT, "designation" TEXT, "domain_expertise" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL, "is_active" BOOLEAN DEFAULT true NOT NULL, "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL, "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "industrial_mentors_pkey" PRIMARY KEY ("id"))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "industrial_mentors_user_id_key" ON "industrial_mentors"("user_id")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "industrial_mentors_email_key" ON "industrial_mentors"("email")`,
    `CREATE INDEX IF NOT EXISTS "industrial_mentors_is_active_idx" ON "industrial_mentors"("is_active")`,
    `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "faculty_mentor_id" TEXT`,
    `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "industrial_mentor_id" TEXT`,
    `CREATE INDEX IF NOT EXISTS "teams_faculty_mentor_id_idx" ON "teams"("faculty_mentor_id")`,
    `CREATE INDEX IF NOT EXISTS "teams_industrial_mentor_id_idx" ON "teams"("industrial_mentor_id")`,
    `ALTER TABLE "mentor_assignments" ADD COLUMN IF NOT EXISTS "industrial_mentor_id" TEXT`,
    `CREATE INDEX IF NOT EXISTS "mentor_assignments_industrial_mentor_id_active_idx" ON "mentor_assignments"("industrial_mentor_id", "active")`,
    `ALTER TABLE "industrial_mentors" DROP CONSTRAINT IF EXISTS "industrial_mentors_user_id_fkey"`,
    `ALTER TABLE "industrial_mentors" ADD CONSTRAINT "industrial_mentors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_faculty_mentor_id_fkey"`,
    `ALTER TABLE "teams" ADD CONSTRAINT "teams_faculty_mentor_id_fkey" FOREIGN KEY ("faculty_mentor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    `ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_industrial_mentor_id_fkey"`,
    `ALTER TABLE "teams" ADD CONSTRAINT "teams_industrial_mentor_id_fkey" FOREIGN KEY ("industrial_mentor_id") REFERENCES "industrial_mentors"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    `ALTER TABLE "mentor_assignments" DROP CONSTRAINT IF EXISTS "mentor_assignments_industrial_mentor_id_fkey"`,
    `ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_industrial_mentor_id_fkey" FOREIGN KEY ("industrial_mentor_id") REFERENCES "industrial_mentors"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    `ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "actor_name" TEXT`,
    `ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "actor_email" TEXT`,
    `ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "actor_role" TEXT`,
    // Stage deadlines removed — unlock any deliverables that were auto-locked by them.
    `ALTER TABLE "stages" DROP COLUMN IF EXISTS "deadline"`,
    `UPDATE "deliverables" SET "locked" = false WHERE "locked" = true`,
    // Track per-row credential email delivery for bulk imports.
    `ALTER TABLE "user_import_rows" ADD COLUMN IF NOT EXISTS "email_sent" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "user_import_rows" ADD COLUMN IF NOT EXISTS "email_error" TEXT`,
    `ALTER TABLE "user_import_rows" ADD COLUMN IF NOT EXISTS "email_sent_at" TIMESTAMP(3)`,
    // Dual-role accounts: secondary roles in an enum array (platform_role stays primary).
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "additional_roles" "PlatformRole"[] NOT NULL DEFAULT '{}'`,
    `ALTER TABLE "deliverables" ADD COLUMN IF NOT EXISTS "ppt_file_name" TEXT`,
    `ALTER TABLE "deliverables" ADD COLUMN IF NOT EXISTS "report_file_name" TEXT`,
    // Admin batches of teams (mirrors migrations/20261002000000_add_batches).
    `CREATE TABLE IF NOT EXISTS "batches" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "created_by" TEXT NOT NULL, "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL, "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "batches_pkey" PRIMARY KEY ("id"))`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "batches_name_key" ON "batches"("name")`,
    `ALTER TABLE "batches" DROP CONSTRAINT IF EXISTS "batches_created_by_fkey"`,
    `ALTER TABLE "batches" ADD CONSTRAINT "batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "batch_id" TEXT`,
    `CREATE INDEX IF NOT EXISTS "teams_batch_id_idx" ON "teams"("batch_id")`,
    `ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_batch_id_fkey"`,
    `ALTER TABLE "teams" ADD CONSTRAINT "teams_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    // Mentor LinkedIn link (mirrors migrations/20261004120000). The Prisma client selects this column on
    // every user query, so it MUST exist or login and /me fail with P2022 "column does not exist".
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "linkedin_url" TEXT`,
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

  // Backfill linkedin_url from the older profileJson copy (best effort — never blocks startup).
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "linkedin_url" = "profile_json" ->> 'linkedinUrl' WHERE "linkedin_url" IS NULL AND "profile_json" ->> 'linkedinUrl' IS NOT NULL AND "profile_json" ->> 'linkedinUrl' <> ''`,
    );
    console.log('[ensure-columns] ok: linkedin_url backfill');
  } catch (err) {
    console.warn('[ensure-columns] linkedin_url backfill skipped:', err && err.message ? err.message : err);
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

  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'team_join_request'`);
    console.log('[ensure-columns] ok: NotificationType.team_join_request');
  } catch (err) {
    console.warn('[ensure-columns] NotificationType.team_join_request skipped:', err && err.message ? err.message : err);
  }

  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "PlatformRole" ADD VALUE IF NOT EXISTS 'student_expert'`);
    console.log('[ensure-columns] ok: PlatformRole.student_expert');
  } catch (err) {
    console.warn('[ensure-columns] PlatformRole.student_expert skipped:', err && err.message ? err.message : err);
  }

  // Hot-path indexes for list endpoints under concurrent load.
  const indexStatements = [
    `CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users"("is_active")`,
    `CREATE INDEX IF NOT EXISTS "users_platform_role_is_active_idx" ON "users"("platform_role", "is_active")`,
    `CREATE INDEX IF NOT EXISTS "rubrics_stage_id_idx" ON "rubrics"("stage_id")`,
    `CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at")`,
  ];
  for (const sql of indexStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('[ensure-columns] ok:', sql);
    } catch (err) {
      console.warn('[ensure-columns] index skipped:', sql, err && err.message ? err.message : err);
    }
  }

  // Backfill industrial mentor profiles for existing industry_mentor users, then
  // wire link columns + team pointers (idempotent).
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "industrial_mentors" ("id", "user_id", "full_name", "email", "phone", "company_name", "designation", "domain_expertise", "is_active", "created_at", "updated_at")
      SELECT gen_random_uuid()::text, "id", "full_name", "email", "phone", "institute", "department", "domain_tags", "is_active", now(), now()
      FROM "users" WHERE "platform_role" = 'industry_mentor'
      ON CONFLICT ("user_id") DO NOTHING`);
    console.log('[ensure-columns] ok: backfilled industrial_mentor profiles');
  } catch (err) {
    console.warn('[ensure-columns] industrial_mentors backfill skipped:', err && err.message ? err.message : err);
  }

  try {
    await prisma.$executeRawUnsafe(`
      UPDATE "mentor_assignments" a
      SET "industrial_mentor_id" = im."id"
      FROM "industrial_mentors" im
      WHERE a."mentor_type" = 'industry' AND im."user_id" = a."mentor_user_id" AND a."industrial_mentor_id" IS NULL`);
    await prisma.$executeRawUnsafe(`
      UPDATE "teams" t
      SET "faculty_mentor_id" = sub."fid", "industrial_mentor_id" = sub."iid"
      FROM (
        SELECT ma."team_id",
          max(ma."mentor_user_id") FILTER (WHERE ma."mentor_type" = 'institute' AND ma."active") AS "fid",
          max(ma."industrial_mentor_id") FILTER (WHERE ma."mentor_type" = 'industry' AND ma."active") AS "iid"
        FROM "mentor_assignments" ma GROUP BY ma."team_id"
      ) sub
      WHERE t."id" = sub."team_id"`);
    console.log('[ensure-columns] ok: synced industrial mentor pointers');
  } catch (err) {
    console.warn('[ensure-columns] industrial mentor pointer sync skipped:', err && err.message ? err.message : err);
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
