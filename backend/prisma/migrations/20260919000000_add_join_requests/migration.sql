-- Join requests: students request to join a team; the team lead accepts or rejects.
-- Idempotent so it applies cleanly on a fresh database AND on the shared prod DB
-- where the objects were pre-created via `prisma db push` (deploy runs
-- `prisma migrate deploy`, which requires migrations here to be re-run safe).

-- Prisma's db push cannot express a partial unique index, so it lives here (and in
-- prisma/ensure-columns.ts / ensure-columns.cjs, which run on every build).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JoinRequestStatus') THEN
    CREATE TYPE "JoinRequestStatus" AS ENUM ('pending', 'accepted', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "join_requests" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "join_requests_pkey" PRIMARY KEY ("id")
);

-- One pending request per student per team. Re-requesting after a reject is
-- allowed because status='pending' is part of the index predicate.
CREATE UNIQUE INDEX IF NOT EXISTS "join_requests_one_pending_idx" ON "join_requests"("student_id", "team_id") WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS "join_requests_team_id_status_idx" ON "join_requests"("team_id", "status");
CREATE INDEX IF NOT EXISTS "join_requests_student_id_idx" ON "join_requests"("student_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'join_requests_student_id_fkey') THEN
    ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'join_requests_team_id_fkey') THEN
    ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;