-- CreateEnum
CREATE TYPE "PsPreferenceStatus" AS ENUM ('submitted', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "team_ps_preferences" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "ps_id" TEXT,
    "title" TEXT,
    "theme" TEXT,
    "category" "PsCategory",
    "organisation" TEXT,
    "description" TEXT,
    "status" "PsPreferenceStatus" NOT NULL DEFAULT 'submitted',
    "submitted_by_id" TEXT NOT NULL,
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_ps_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_ps_preferences_team_id_status_idx" ON "team_ps_preferences"("team_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "team_ps_preferences_team_id_rank_key" ON "team_ps_preferences"("team_id", "rank");

-- AddForeignKey
ALTER TABLE "team_ps_preferences" ADD CONSTRAINT "team_ps_preferences_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_ps_preferences" ADD CONSTRAINT "team_ps_preferences_ps_id_fkey" FOREIGN KEY ("ps_id") REFERENCES "problem_statements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_ps_preferences" ADD CONSTRAINT "team_ps_preferences_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_ps_preferences" ADD CONSTRAINT "team_ps_preferences_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
