-- Remove stage deadlines and unlock deliverables that were auto-locked by them.
ALTER TABLE "stages" DROP COLUMN IF EXISTS "deadline";
UPDATE "deliverables" SET "locked" = false WHERE "locked" = true;
