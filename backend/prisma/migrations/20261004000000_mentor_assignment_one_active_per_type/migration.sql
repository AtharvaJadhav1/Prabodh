-- At most one ACTIVE mentor assignment per (team, mentor_type).
-- Idempotent: safe to re-run.

-- 1) Deactivate older duplicate active rows, keeping the newest per (team_id, mentor_type)
--    (assigned_at desc, created_at desc, id desc as final tiebreak) — same rule as
--    scripts/fix-duplicate-mentor-assignments.ts, but also collapsing same-person duplicates
--    because the unique index below would reject those too.
UPDATE "mentor_assignments" AS ma
SET "active" = false,
    "updated_at" = NOW()
WHERE ma."active" = true
  AND EXISTS (
    SELECT 1
    FROM "mentor_assignments" AS newer
    WHERE newer."team_id" = ma."team_id"
      AND newer."mentor_type" = ma."mentor_type"
      AND newer."active" = true
      AND newer."id" <> ma."id"
      AND (
        newer."assigned_at" > ma."assigned_at"
        OR (newer."assigned_at" = ma."assigned_at" AND newer."created_at" > ma."created_at")
        OR (newer."assigned_at" = ma."assigned_at" AND newer."created_at" = ma."created_at" AND newer."id" > ma."id")
      )
  );

-- 2) Re-sync the denormalized pointers on teams for teams that still have drifted values.
UPDATE "teams" AS t
SET "faculty_mentor_id" = (
      SELECT a."mentor_user_id" FROM "mentor_assignments" a
      WHERE a."team_id" = t."id" AND a."mentor_type" = 'institute' AND a."active" = true LIMIT 1
    ),
    "industrial_mentor_id" = (
      SELECT a."industrial_mentor_id" FROM "mentor_assignments" a
      WHERE a."team_id" = t."id" AND a."mentor_type" = 'industry' AND a."active" = true LIMIT 1
    )
WHERE t."faculty_mentor_id" IS DISTINCT FROM (
        SELECT a."mentor_user_id" FROM "mentor_assignments" a
        WHERE a."team_id" = t."id" AND a."mentor_type" = 'institute' AND a."active" = true LIMIT 1
      )
   OR t."industrial_mentor_id" IS DISTINCT FROM (
        SELECT a."industrial_mentor_id" FROM "mentor_assignments" a
        WHERE a."team_id" = t."id" AND a."mentor_type" = 'industry' AND a."active" = true LIMIT 1
      );

-- 3) Clear mentor_locked_at where no active faculty seat remains.
UPDATE "teams" AS t
SET "mentor_locked_at" = NULL
WHERE t."mentor_locked_at" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "mentor_assignments" a
    WHERE a."team_id" = t."id" AND a."mentor_type" = 'institute' AND a."active" = true
  );

-- 4) The guarantee itself.
CREATE UNIQUE INDEX IF NOT EXISTS "mentor_assignments_team_type_active_unique"
  ON "mentor_assignments" ("team_id", "mentor_type")
  WHERE "active" = true;
