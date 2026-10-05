-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "FriendshipStatus" AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "friendships" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "addressee_id" TEXT NOT NULL,
    "pair_key" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "direct_messages" (
    "id" TEXT NOT NULL,
    "pair_key" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "client_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_read_states" (
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_read_states_pkey" PRIMARY KEY ("user_id","team_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_pair_key_key" ON "friendships"("pair_key");
CREATE INDEX IF NOT EXISTS "friendships_addressee_id_status_idx" ON "friendships"("addressee_id", "status");
CREATE INDEX IF NOT EXISTS "friendships_requester_id_status_idx" ON "friendships"("requester_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "direct_messages_sender_id_client_id_key" ON "direct_messages"("sender_id", "client_id");
CREATE INDEX IF NOT EXISTS "direct_messages_pair_key_created_at_idx" ON "direct_messages"("pair_key", "created_at");
CREATE INDEX IF NOT EXISTS "direct_messages_recipient_id_read_at_idx" ON "direct_messages"("recipient_id", "read_at");
CREATE INDEX IF NOT EXISTS "chat_read_states_team_id_idx" ON "chat_read_states"("team_id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "chat_read_states" ADD CONSTRAINT "chat_read_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "chat_read_states" ADD CONSTRAINT "chat_read_states_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
