-- AlterTable
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "mentor_locked_at" TIMESTAMP(3);
