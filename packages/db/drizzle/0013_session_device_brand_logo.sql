ALTER TABLE "sessions"
ADD COLUMN IF NOT EXISTS "client_ip" text;

ALTER TABLE "sessions"
ADD COLUMN IF NOT EXISTS "user_agent" text;

ALTER TABLE "sessions"
ADD COLUMN IF NOT EXISTS "device_label" text;

ALTER TABLE "sessions"
ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL;

ALTER TABLE "sessions"
ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;

ALTER TABLE "sessions"
ADD COLUMN IF NOT EXISTS "refresh_token_hash" text;

ALTER TABLE "sessions"
ADD COLUMN IF NOT EXISTS "refresh_expires_at" timestamp with time zone;

ALTER TABLE "brands"
ADD COLUMN IF NOT EXISTS "logo_url" text;

UPDATE "aircraft_categories"
SET "name" = CASE
  WHEN "slug" = 'drone' THEN '无人机'
  WHEN "slug" = 'evtol' THEN '电动垂直起降'
  WHEN "slug" = 'helicopter' THEN '直升机'
  WHEN "slug" = 'business-jet' THEN '公务机'
  ELSE "name"
END
WHERE "slug" IN ('drone', 'evtol', 'helicopter', 'business-jet');
