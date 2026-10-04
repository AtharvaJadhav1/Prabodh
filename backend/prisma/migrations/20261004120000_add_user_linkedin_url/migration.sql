-- Mentor LinkedIn profile link. A dedicated column (not profileJson) so the
-- student-facing mentor lists can expose just this one field without also
-- handing out the mentor's private profileJson notes.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "linkedin_url" TEXT;

-- Existing industry mentors already saved their link into profileJson.linkedinUrl.
UPDATE "users"
SET "linkedin_url" = "profile_json" ->> 'linkedinUrl'
WHERE "linkedin_url" IS NULL
  AND "profile_json" ->> 'linkedinUrl' IS NOT NULL
  AND "profile_json" ->> 'linkedinUrl' <> '';