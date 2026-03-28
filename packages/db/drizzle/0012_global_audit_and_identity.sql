ALTER TABLE "site_settings"
ADD COLUMN IF NOT EXISTS "comment_moderation_enabled" boolean DEFAULT false NOT NULL;

ALTER TABLE "site_settings"
ADD COLUMN IF NOT EXISTS "review_moderation_enabled" boolean DEFAULT false NOT NULL;

ALTER TABLE "site_settings"
ADD COLUMN IF NOT EXISTS "submission_moderation_enabled" boolean DEFAULT true NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_display_name_unique"
ON "users" USING btree ("display_name");
