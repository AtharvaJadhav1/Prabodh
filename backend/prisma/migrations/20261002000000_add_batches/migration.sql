-- Admin-managed batches of teams
CREATE TABLE IF NOT EXISTS "batches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "batches_name_key" ON "batches"("name");

ALTER TABLE "batches" DROP CONSTRAINT IF EXISTS "batches_created_by_fkey";
ALTER TABLE "batches" ADD CONSTRAINT "batches_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "batch_id" TEXT;
CREATE INDEX IF NOT EXISTS "teams_batch_id_idx" ON "teams"("batch_id");

ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_batch_id_fkey";
ALTER TABLE "teams" ADD CONSTRAINT "teams_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
