-- Team rosters are now unbounded: drop the member cap entirely.
ALTER TABLE "teams" DROP COLUMN "member_cap";

-- Retire the now-unused platform setting row.
DELETE FROM "platform_settings" WHERE "key" = 'member_cap';