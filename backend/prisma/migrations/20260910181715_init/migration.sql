-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('student', 'institute_mentor', 'industry_mentor', 'admin');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('forming', 'active', 'locked', 'disqualified');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "PsCategory" AS ENUM ('software', 'hardware');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('draft', 'locked', 'abandoned');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('pending_review', 'activated', 'rejected');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('pending', 'activated', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "MentorType" AS ENUM ('institute', 'industry');

-- CreateEnum
CREATE TYPE "AssignmentMethod" AS ENUM ('manual', 'auto_rule');

-- CreateEnum
CREATE TYPE "StageProgressStatus" AS ENUM ('not_started', 'in_progress', 'submitted', 'reviewed', 'qualified', 'rejected');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('allocation', 'deadline', 'evaluation_published', 'status_change', 'broadcast', 'comment');

-- CreateEnum
CREATE TYPE "NotificationLogStatus" AS ENUM ('queued', 'sent', 'delivered', 'opened', 'bounced', 'failed');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('queued', 'running', 'complete', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "platform_role" "PlatformRole" NOT NULL,
    "institute" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "domain_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "clerk_org_id" TEXT NOT NULL,
    "team_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT,
    "institute" TEXT NOT NULL,
    "leader_user_id" TEXT NOT NULL,
    "ps_id" TEXT,
    "status" "TeamStatus" NOT NULL DEFAULT 'forming',
    "member_cap" INTEGER NOT NULL DEFAULT 6,
    "details_lock_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT,
    "invited_email" TEXT NOT NULL,
    "invite_status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "clerk_invitation_id" TEXT,
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_statements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "category" "PsCategory" NOT NULL,
    "organisation" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "team_cap" INTEGER,
    "teams_selected_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_submissions" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "ps_id" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "tech_stack" TEXT NOT NULL,
    "feasibility_notes" TEXT NOT NULL,
    "status" "IdeaStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "locked_at" TIMESTAMP(3),
    "author_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idea_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_assignments" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "mentor_user_id" TEXT NOT NULL,
    "mentor_type" "MentorType" NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "assignment_method" "AssignmentMethod" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reassigned_from_id" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubrics" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "weightage" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rubrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverables" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "ppt_url" TEXT,
    "report_url" TEXT,
    "video_url" TEXT,
    "github_url" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "scan_status" TEXT NOT NULL DEFAULT 'skipped',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_stage_status" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "status" "StageProgressStatus" NOT NULL DEFAULT 'not_started',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_stage_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "rubric_id" TEXT NOT NULL,
    "evaluator_user_id" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "feedback" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_results" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "weighted_score" DECIMAL(6,2) NOT NULL,
    "rank" INTEGER,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "published_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "related_entity" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_log" (
    "id" TEXT NOT NULL,
    "recipient_user_id" TEXT,
    "recipient_email" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "status" "NotificationLogStatus" NOT NULL DEFAULT 'queued',
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "filter_criteria" JSONB NOT NULL DEFAULT '{}',
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "parent_comment_id" TEXT,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'queued',
    "file_key" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "user_import_batches" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'pending_review',
    "row_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_import_rows" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "platform_role" "PlatformRole" NOT NULL,
    "institute" TEXT,
    "department" TEXT,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "teams_clerk_org_id_key" ON "teams"("clerk_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_team_code_key" ON "teams"("team_code");

-- CreateIndex
CREATE INDEX "teams_status_idx" ON "teams"("status");

-- CreateIndex
CREATE INDEX "teams_theme_idx" ON "teams"("theme");

-- CreateIndex
CREATE INDEX "teams_institute_idx" ON "teams"("institute");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_invited_email_key" ON "team_members"("team_id", "invited_email");

-- CreateIndex
CREATE UNIQUE INDEX "problem_statements_code_key" ON "problem_statements"("code");

-- CreateIndex
CREATE INDEX "problem_statements_theme_idx" ON "problem_statements"("theme");

-- CreateIndex
CREATE INDEX "problem_statements_category_idx" ON "problem_statements"("category");

-- CreateIndex
CREATE INDEX "problem_statements_organisation_idx" ON "problem_statements"("organisation");

-- CreateIndex
CREATE INDEX "idea_submissions_team_id_idx" ON "idea_submissions"("team_id");

-- CreateIndex
CREATE INDEX "mentor_assignments_team_id_idx" ON "mentor_assignments"("team_id");

-- CreateIndex
CREATE INDEX "mentor_assignments_mentor_user_id_active_idx" ON "mentor_assignments"("mentor_user_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "stages_sequence_key" ON "stages"("sequence");

-- CreateIndex
CREATE INDEX "deliverables_team_id_stage_id_idx" ON "deliverables"("team_id", "stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_stage_status_team_id_stage_id_key" ON "team_stage_status"("team_id", "stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_superseded_by_id_key" ON "evaluations"("superseded_by_id");

-- CreateIndex
CREATE INDEX "evaluations_team_id_stage_id_evaluator_user_id_idx" ON "evaluations"("team_id", "stage_id", "evaluator_user_id");

-- CreateIndex
CREATE INDEX "stage_results_stage_id_published_idx" ON "stage_results"("stage_id", "published");

-- CreateIndex
CREATE UNIQUE INDEX "stage_results_team_id_stage_id_key" ON "stage_results"("team_id", "stage_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notification_log_provider_message_id_idx" ON "notification_log"("provider_message_id");

-- CreateIndex
CREATE INDEX "comments_team_id_idx" ON "comments"("team_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_actor_user_id_idx" ON "audit_log"("actor_user_id");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_leader_user_id_fkey" FOREIGN KEY ("leader_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_ps_id_fkey" FOREIGN KEY ("ps_id") REFERENCES "problem_statements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_submissions" ADD CONSTRAINT "idea_submissions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_submissions" ADD CONSTRAINT "idea_submissions_ps_id_fkey" FOREIGN KEY ("ps_id") REFERENCES "problem_statements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_submissions" ADD CONSTRAINT "idea_submissions_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_mentor_user_id_fkey" FOREIGN KEY ("mentor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_reassigned_from_id_fkey" FOREIGN KEY ("reassigned_from_id") REFERENCES "mentor_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubrics" ADD CONSTRAINT "rubrics_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_stage_status" ADD CONSTRAINT "team_stage_status_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_stage_status" ADD CONSTRAINT "team_stage_status_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "rubrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluator_user_id_fkey" FOREIGN KEY ("evaluator_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_results" ADD CONSTRAINT "stage_results_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_results" ADD CONSTRAINT "stage_results_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_results" ADD CONSTRAINT "stage_results_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_import_rows" ADD CONSTRAINT "user_import_rows_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "user_import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
