-- Drop Clerk integration columns (auth is email/password + JWT only).

ALTER TABLE "team_members" DROP COLUMN IF EXISTS "clerk_invitation_id";

DROP INDEX IF EXISTS "teams_clerk_org_id_key";
ALTER TABLE "teams" DROP COLUMN IF EXISTS "clerk_org_id";

DROP INDEX IF EXISTS "users_clerk_user_id_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "clerk_user_id";
