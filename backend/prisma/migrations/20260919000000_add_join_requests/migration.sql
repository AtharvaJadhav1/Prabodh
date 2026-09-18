-- Join requests: students request to join a team; the team lead accepts or rejects.
-- Requires the join_requests table + partial unique index (Prisma cannot express
-- partial indexes in schema.prisma, so this is hand-maintained here and mirrored
-- in prisma/ensure-columns.ts for the db-push build path).

CREATE TYPE "JoinRequestStatus" AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE "join_requests" (
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
CREATE UNIQUE INDEX "join_requests_one_pending_idx" ON "join_requests"("student_id", "team_id") WHERE "status" = 'pending';
CREATE INDEX "join_requests_team_id_status_idx" ON "join_requests"("team_id", "status");
CREATE INDEX "join_requests_student_id_idx" ON "join_requests"("student_id");

ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;