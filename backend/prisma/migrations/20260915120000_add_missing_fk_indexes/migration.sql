-- Add missing indexes on foreign-key columns used in WHERE/JOIN filters.
-- Prisma/Postgres do not auto-index plain relation scalar FKs, so these
-- were doing sequential scans on tables that grow with usage.

CREATE INDEX IF NOT EXISTS "teams_leader_user_id_idx" ON "teams"("leader_user_id");
CREATE INDEX IF NOT EXISTS "teams_ps_id_idx" ON "teams"("ps_id");
CREATE INDEX IF NOT EXISTS "team_members_user_id_idx" ON "team_members"("user_id");
CREATE INDEX IF NOT EXISTS "idea_submissions_ps_id_idx" ON "idea_submissions"("ps_id");
CREATE INDEX IF NOT EXISTS "idea_submissions_author_user_id_idx" ON "idea_submissions"("author_user_id");
CREATE INDEX IF NOT EXISTS "evaluations_rubric_id_idx" ON "evaluations"("rubric_id");
CREATE INDEX IF NOT EXISTS "comments_parent_comment_id_idx" ON "comments"("parent_comment_id");
CREATE INDEX IF NOT EXISTS "notification_log_recipient_user_id_idx" ON "notification_log"("recipient_user_id");
