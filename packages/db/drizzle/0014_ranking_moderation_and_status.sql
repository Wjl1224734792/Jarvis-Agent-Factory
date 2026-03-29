ALTER TABLE "site_settings"
ADD COLUMN IF NOT EXISTS "ranking_moderation_enabled" boolean DEFAULT false NOT NULL;

ALTER TABLE "rankings"
ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'published' NOT NULL;

UPDATE "rankings"
SET "status" = 'published'
WHERE "status" IS NULL;
