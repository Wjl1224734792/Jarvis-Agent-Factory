ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "article_moderation_enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "moment_moderation_enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "brand_moderation_enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "model_moderation_enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "ranking_item_moderation_enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
UPDATE "site_settings"
SET
  "article_moderation_enabled" = coalesce("article_moderation_enabled", "post_moderation_enabled"),
  "moment_moderation_enabled" = coalesce("moment_moderation_enabled", "post_moderation_enabled"),
  "brand_moderation_enabled" = coalesce("brand_moderation_enabled", true),
  "model_moderation_enabled" = coalesce("model_moderation_enabled", "submission_moderation_enabled"),
  "ranking_item_moderation_enabled" = coalesce("ranking_item_moderation_enabled", "ranking_moderation_enabled");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "brand_applications" (
  "id" text PRIMARY KEY NOT NULL,
  "applicant_id" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "logo_url" text,
  "description" text,
  "approved_brand_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_applications"
  ADD CONSTRAINT "brand_applications_applicant_id_users_id_fk"
  FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "brand_applications"
  ADD CONSTRAINT "brand_applications_approved_brand_id_brands_id_fk"
  FOREIGN KEY ("approved_brand_id") REFERENCES "public"."brands"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "aircraft_models" ADD COLUMN IF NOT EXISTS "owner_id" text;
--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN IF NOT EXISTS "source_submission_id" text;
--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN IF NOT EXISTS "report_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "aircraft_models"
  ADD CONSTRAINT "aircraft_models_owner_id_users_id_fk"
  FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
UPDATE "aircraft_models" AS "m"
SET
  "owner_id" = "s"."author_id",
  "source_submission_id" = "s"."id"
FROM "aircraft_submissions" AS "s"
WHERE "s"."approved_model_id" = "m"."id";
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "aircraft_model_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "model_id" text NOT NULL,
  "reporter_id" text NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "aircraft_model_reports_model_reporter_unique"
  ON "aircraft_model_reports" ("model_id", "reporter_id");
--> statement-breakpoint
ALTER TABLE "aircraft_model_reports"
  ADD CONSTRAINT "aircraft_model_reports_model_id_aircraft_models_id_fk"
  FOREIGN KEY ("model_id") REFERENCES "public"."aircraft_models"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "aircraft_model_reports"
  ADD CONSTRAINT "aircraft_model_reports_reporter_id_users_id_fk"
  FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "aircraft_reviews" ADD COLUMN IF NOT EXISTS "like_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "aircraft_reviews" ADD COLUMN IF NOT EXISTS "report_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aircraft_review_likes" (
  "id" text PRIMARY KEY NOT NULL,
  "review_id" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "aircraft_review_likes_review_user_unique"
  ON "aircraft_review_likes" ("review_id", "user_id");
--> statement-breakpoint
ALTER TABLE "aircraft_review_likes"
  ADD CONSTRAINT "aircraft_review_likes_review_id_aircraft_reviews_id_fk"
  FOREIGN KEY ("review_id") REFERENCES "public"."aircraft_reviews"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "aircraft_review_likes"
  ADD CONSTRAINT "aircraft_review_likes_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aircraft_review_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "review_id" text NOT NULL,
  "reporter_id" text NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "aircraft_review_reports_review_reporter_unique"
  ON "aircraft_review_reports" ("review_id", "reporter_id");
--> statement-breakpoint
ALTER TABLE "aircraft_review_reports"
  ADD CONSTRAINT "aircraft_review_reports_review_id_aircraft_reviews_id_fk"
  FOREIGN KEY ("review_id") REFERENCES "public"."aircraft_reviews"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "aircraft_review_reports"
  ADD CONSTRAINT "aircraft_review_reports_reporter_id_users_id_fk"
  FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "review_comments" ADD COLUMN IF NOT EXISTS "like_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "review_comments" ADD COLUMN IF NOT EXISTS "report_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_comment_likes" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "review_comment_likes_comment_user_unique"
  ON "review_comment_likes" ("comment_id", "user_id");
--> statement-breakpoint
ALTER TABLE "review_comment_likes"
  ADD CONSTRAINT "review_comment_likes_comment_id_review_comments_id_fk"
  FOREIGN KEY ("comment_id") REFERENCES "public"."review_comments"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "review_comment_likes"
  ADD CONSTRAINT "review_comment_likes_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_comment_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL,
  "reporter_id" text NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "review_comment_reports_comment_reporter_unique"
  ON "review_comment_reports" ("comment_id", "reporter_id");
--> statement-breakpoint
ALTER TABLE "review_comment_reports"
  ADD CONSTRAINT "review_comment_reports_comment_id_review_comments_id_fk"
  FOREIGN KEY ("comment_id") REFERENCES "public"."review_comments"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "review_comment_reports"
  ADD CONSTRAINT "review_comment_reports_reporter_id_users_id_fk"
  FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "post_comments" ADD COLUMN IF NOT EXISTS "like_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "post_comments" ADD COLUMN IF NOT EXISTS "report_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_comment_likes" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "post_comment_likes_comment_user_unique"
  ON "post_comment_likes" ("comment_id", "user_id");
--> statement-breakpoint
ALTER TABLE "post_comment_likes"
  ADD CONSTRAINT "post_comment_likes_comment_id_post_comments_id_fk"
  FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "post_comment_likes"
  ADD CONSTRAINT "post_comment_likes_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_comment_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL,
  "reporter_id" text NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "post_comment_reports_comment_reporter_unique"
  ON "post_comment_reports" ("comment_id", "reporter_id");
--> statement-breakpoint
ALTER TABLE "post_comment_reports"
  ADD CONSTRAINT "post_comment_reports_comment_id_post_comments_id_fk"
  FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "post_comment_reports"
  ADD CONSTRAINT "post_comment_reports_reporter_id_users_id_fk"
  FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rankings" ADD COLUMN IF NOT EXISTS "report_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ranking_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "ranking_id" text NOT NULL,
  "reporter_id" text NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ranking_reports_ranking_reporter_unique"
  ON "ranking_reports" ("ranking_id", "reporter_id");
--> statement-breakpoint
ALTER TABLE "ranking_reports"
  ADD CONSTRAINT "ranking_reports_ranking_id_rankings_id_fk"
  FOREIGN KEY ("ranking_id") REFERENCES "public"."rankings"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ranking_reports"
  ADD CONSTRAINT "ranking_reports_reporter_id_users_id_fk"
  FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ranking_items" ADD COLUMN IF NOT EXISTS "author_id" text;
--> statement-breakpoint
ALTER TABLE "ranking_items" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'published';
--> statement-breakpoint
ALTER TABLE "ranking_items" ADD COLUMN IF NOT EXISTS "like_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_items" ADD COLUMN IF NOT EXISTS "report_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "ranking_items" AS "ri"
SET
  "author_id" = "r"."author_id",
  "status" = coalesce("ri"."status", 'published')
FROM "rankings" AS "r"
WHERE "ri"."ranking_id" = "r"."id";
--> statement-breakpoint
ALTER TABLE "ranking_items" ALTER COLUMN "author_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_items" ALTER COLUMN "status" SET DEFAULT 'published';
--> statement-breakpoint
ALTER TABLE "ranking_items" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_items"
  ADD CONSTRAINT "ranking_items_author_id_users_id_fk"
  FOREIGN KEY ("author_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ranking_item_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "ranking_item_id" text NOT NULL,
  "reporter_id" text NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ranking_item_reports_item_reporter_unique"
  ON "ranking_item_reports" ("ranking_item_id", "reporter_id");
--> statement-breakpoint
ALTER TABLE "ranking_item_reports"
  ADD CONSTRAINT "ranking_item_reports_ranking_item_id_ranking_items_id_fk"
  FOREIGN KEY ("ranking_item_id") REFERENCES "public"."ranking_items"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ranking_item_reports"
  ADD CONSTRAINT "ranking_item_reports_reporter_id_users_id_fk"
  FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ranking_comments" ADD COLUMN IF NOT EXISTS "like_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_comments" ADD COLUMN IF NOT EXISTS "report_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ranking_comment_likes" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ranking_comment_likes_comment_user_unique"
  ON "ranking_comment_likes" ("comment_id", "user_id");
--> statement-breakpoint
ALTER TABLE "ranking_comment_likes"
  ADD CONSTRAINT "ranking_comment_likes_comment_id_ranking_comments_id_fk"
  FOREIGN KEY ("comment_id") REFERENCES "public"."ranking_comments"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ranking_comment_likes"
  ADD CONSTRAINT "ranking_comment_likes_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ranking_comment_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL,
  "reporter_id" text NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ranking_comment_reports_comment_reporter_unique"
  ON "ranking_comment_reports" ("comment_id", "reporter_id");
--> statement-breakpoint
ALTER TABLE "ranking_comment_reports"
  ADD CONSTRAINT "ranking_comment_reports_comment_id_ranking_comments_id_fk"
  FOREIGN KEY ("comment_id") REFERENCES "public"."ranking_comments"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ranking_comment_reports"
  ADD CONSTRAINT "ranking_comment_reports_reporter_id_users_id_fk"
  FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

DROP INDEX IF EXISTS "ranking_item_comments_item_author_unique";
--> statement-breakpoint
ALTER TABLE "ranking_item_comments" ADD COLUMN IF NOT EXISTS "parent_comment_id" text;
--> statement-breakpoint
ALTER TABLE "ranking_item_comments" ADD COLUMN IF NOT EXISTS "reply_to_comment_id" text;
--> statement-breakpoint
ALTER TABLE "ranking_item_comments" ADD COLUMN IF NOT EXISTS "reply_to_user_id" text;
--> statement-breakpoint
ALTER TABLE "ranking_item_comments" ADD COLUMN IF NOT EXISTS "like_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_item_comments" ADD COLUMN IF NOT EXISTS "report_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_item_comments"
  ADD CONSTRAINT "ranking_item_comments_parent_comment_id_fk"
  FOREIGN KEY ("parent_comment_id") REFERENCES "public"."ranking_item_comments"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ranking_item_comments"
  ADD CONSTRAINT "ranking_item_comments_reply_to_comment_id_fk"
  FOREIGN KEY ("reply_to_comment_id") REFERENCES "public"."ranking_item_comments"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ranking_item_comments"
  ADD CONSTRAINT "ranking_item_comments_reply_to_user_id_users_id_fk"
  FOREIGN KEY ("reply_to_user_id") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ranking_item_comment_likes" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ranking_item_comment_likes_comment_user_unique"
  ON "ranking_item_comment_likes" ("comment_id", "user_id");
--> statement-breakpoint
ALTER TABLE "ranking_item_comment_likes"
  ADD CONSTRAINT "ranking_item_comment_likes_comment_id_ranking_item_comments_id_fk"
  FOREIGN KEY ("comment_id") REFERENCES "public"."ranking_item_comments"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ranking_item_comment_likes"
  ADD CONSTRAINT "ranking_item_comment_likes_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ranking_item_comment_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL,
  "reporter_id" text NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ranking_item_comment_reports_comment_reporter_unique"
  ON "ranking_item_comment_reports" ("comment_id", "reporter_id");
--> statement-breakpoint
ALTER TABLE "ranking_item_comment_reports"
  ADD CONSTRAINT "ranking_item_comment_reports_comment_id_ranking_item_comments_id_fk"
  FOREIGN KEY ("comment_id") REFERENCES "public"."ranking_item_comments"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ranking_item_comment_reports"
  ADD CONSTRAINT "ranking_item_comment_reports_reporter_id_users_id_fk"
  FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
