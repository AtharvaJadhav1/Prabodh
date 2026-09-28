-- Audit log actor snapshots.
-- Audience: audit rows must survive a user being hard-deleted (admin "remove
-- person" flow). The actor FK becomes nullable and the actor's name/email/role
-- are snapshot onto each row at write time so the logs stay renderable.
-- Idempotent so it applies cleanly on a fresh database AND on the shared prod DB.

ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "actor_name" TEXT;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "actor_email" TEXT;
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "actor_role" TEXT;

-- Backfill snapshots from the current users table.
UPDATE "audit_log" a
SET "actor_name" = u."full_name", "actor_email" = u."email", "actor_role" = u."platform_role"
FROM "users" u
WHERE a."actor_user_id" = u."id"
  AND (a."actor_name" IS NULL OR a."actor_email" IS NULL);

-- Relieve the FK so rows survive the user's hard deletion.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_log_actor_user_id_fkey' AND contype = 'f'
  ) THEN
    ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_actor_user_id_fkey";
  END IF;
END $$;

ALTER TABLE "audit_log" ALTER COLUMN "actor_user_id" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_log_actor_user_id_fkey' AND contype = 'f'
  ) THEN
    ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;