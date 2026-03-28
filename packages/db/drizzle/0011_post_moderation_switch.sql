CREATE TABLE "site_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "post_moderation_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

