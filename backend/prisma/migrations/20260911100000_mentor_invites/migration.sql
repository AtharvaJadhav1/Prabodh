-- CreateTable
CREATE TABLE "mentor_invites" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "invited_email" TEXT NOT NULL,
    "mentor_user_id" TEXT,
    "mentor_type" "MentorType" NOT NULL,
    "invite_status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "invited_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mentor_invites_invited_email_invite_status_idx" ON "mentor_invites"("invited_email", "invite_status");

-- CreateIndex
CREATE INDEX "mentor_invites_mentor_user_id_invite_status_idx" ON "mentor_invites"("mentor_user_id", "invite_status");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_invites_team_id_invited_email_mentor_type_key" ON "mentor_invites"("team_id", "invited_email", "mentor_type");

-- AddForeignKey
ALTER TABLE "mentor_invites" ADD CONSTRAINT "mentor_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_invites" ADD CONSTRAINT "mentor_invites_mentor_user_id_fkey" FOREIGN KEY ("mentor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_invites" ADD CONSTRAINT "mentor_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
