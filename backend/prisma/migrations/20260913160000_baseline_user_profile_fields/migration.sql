-- Baseline: these columns already exist on the live Railway DB (added out-of-band).
-- Records them in migration history so migrate dev no longer reports drift.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_json" JSONB;