ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "action_kind" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "action_ref" TEXT;
CREATE INDEX IF NOT EXISTS "notifications_user_id_action_kind_idx" ON "notifications"("user_id", "action_kind");
