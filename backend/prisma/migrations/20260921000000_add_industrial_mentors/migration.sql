-- IndustrialMentor directory table
CREATE TABLE IF NOT EXISTS "industrial_mentors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company_name" TEXT,
    "designation" TEXT,
    "domain_expertise" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "industrial_mentors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "industrial_mentors_user_id_key" ON "industrial_mentors"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "industrial_mentors_email_key" ON "industrial_mentors"("email");
CREATE INDEX IF NOT EXISTS "industrial_mentors_is_active_idx" ON "industrial_mentors"("is_active");

-- Team pointer columns (derived from active mentor assignments)
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "faculty_mentor_id" TEXT;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "industrial_mentor_id" TEXT;
CREATE INDEX IF NOT EXISTS "teams_faculty_mentor_id_idx" ON "teams"("faculty_mentor_id");
CREATE INDEX IF NOT EXISTS "teams_industrial_mentor_id_idx" ON "teams"("industrial_mentor_id");

-- MentorAssignment link column for industry rows
ALTER TABLE "mentor_assignments" ADD COLUMN IF NOT EXISTS "industrial_mentor_id" TEXT;
CREATE INDEX IF NOT EXISTS "mentor_assignments_industrial_mentor_id_active_idx" ON "mentor_assignments"("industrial_mentor_id", "active");

-- Foreign keys
ALTER TABLE "industrial_mentors" DROP CONSTRAINT IF EXISTS "industrial_mentors_user_id_fkey";
ALTER TABLE "industrial_mentors" ADD CONSTRAINT "industrial_mentors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_faculty_mentor_id_fkey";
ALTER TABLE "teams" ADD CONSTRAINT "teams_faculty_mentor_id_fkey" FOREIGN KEY ("faculty_mentor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_industrial_mentor_id_fkey";
ALTER TABLE "teams" ADD CONSTRAINT "teams_industrial_mentor_id_fkey" FOREIGN KEY ("industrial_mentor_id") REFERENCES "industrial_mentors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "mentor_assignments" DROP CONSTRAINT IF EXISTS "mentor_assignments_industrial_mentor_id_fkey";
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_industrial_mentor_id_fkey" FOREIGN KEY ("industrial_mentor_id") REFERENCES "industrial_mentors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: create a profile for every existing industry_mentor user
INSERT INTO "industrial_mentors" ("id", "user_id", "full_name", "email", "phone", "company_name", "designation", "domain_expertise", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "id", "full_name", "email", "phone", "institute", "department", "domain_tags", "is_active", now(), now()
FROM "users"
WHERE "platform_role" = 'industry_mentor'
ON CONFLICT ("user_id") DO NOTHING;

-- Backfill assignment link column for existing live industry assignments
UPDATE "mentor_assignments" a
SET "industrial_mentor_id" = im."id"
FROM "industrial_mentors" im
WHERE a."mentor_type" = 'industry' AND im."user_id" = a."mentor_user_id" AND a."industrial_mentor_id" IS NULL;

-- Sync team pointer columns from active assignments
UPDATE "teams" t
SET "faculty_mentor_id" = sub."fid", "industrial_mentor_id" = sub."iid"
FROM (
    SELECT
        ma."team_id",
        max(ma."mentor_user_id") FILTER (WHERE ma."mentor_type" = 'institute' AND ma."active") AS "fid",
        max(ma."industrial_mentor_id") FILTER (WHERE ma."mentor_type" = 'industry' AND ma."active") AS "iid"
    FROM "mentor_assignments" ma
    GROUP BY ma."team_id"
) sub
WHERE t."id" = sub."team_id";