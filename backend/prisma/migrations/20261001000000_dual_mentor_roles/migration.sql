-- Dual-role accounts: one email can hold institute_mentor + industry_mentor.
-- platformRole stays the primary role; additionalRoles holds granted extras.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "additional_roles" "PlatformRole"[] NOT NULL DEFAULT '{}';
