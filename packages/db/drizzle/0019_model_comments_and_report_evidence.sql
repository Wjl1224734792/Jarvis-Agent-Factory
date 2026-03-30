ALTER TABLE "aircraft_model_reports" ADD COLUMN IF NOT EXISTS "image_file_ids" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "aircraft_review_reports" ADD COLUMN IF NOT EXISTS "image_file_ids" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "review_comment_reports" ADD COLUMN IF NOT EXISTS "image_file_ids" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "post_comment_reports" ADD COLUMN IF NOT EXISTS "image_file_ids" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "post_reports" ADD COLUMN IF NOT EXISTS "image_file_ids" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_reports" ADD COLUMN IF NOT EXISTS "image_file_ids" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_item_reports" ADD COLUMN IF NOT EXISTS "image_file_ids" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_comment_reports" ADD COLUMN IF NOT EXISTS "image_file_ids" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_item_comment_reports" ADD COLUMN IF NOT EXISTS "image_file_ids" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ranking_item_comments" ADD COLUMN IF NOT EXISTS "rating" integer;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aircraft_model_comments" (
  "id" text PRIMARY KEY NOT NULL,
  "model_id" text NOT NULL REFERENCES "aircraft_models"("id") ON DELETE cascade,
  "author_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "parent_comment_id" text,
  "reply_to_comment_id" text,
  "reply_to_user_id" text REFERENCES "users"("id") ON DELETE set null,
  "content" text NOT NULL,
  "status" text DEFAULT 'visible' NOT NULL,
  "like_count" integer DEFAULT 0 NOT NULL,
  "report_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aircraft_model_comments" ADD CONSTRAINT "aircraft_model_comments_parent_comment_id_aircraft_model_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."aircraft_model_comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aircraft_model_comments" ADD CONSTRAINT "aircraft_model_comments_reply_to_comment_id_aircraft_model_comments_id_fk" FOREIGN KEY ("reply_to_comment_id") REFERENCES "public"."aircraft_model_comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aircraft_model_comment_likes" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL REFERENCES "aircraft_model_comments"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "aircraft_model_comment_likes_comment_user_unique" ON "aircraft_model_comment_likes" USING btree ("comment_id","user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aircraft_model_comment_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "comment_id" text NOT NULL REFERENCES "aircraft_model_comments"("id") ON DELETE cascade,
  "reporter_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "reason" text NOT NULL,
  "image_file_ids" text DEFAULT '[]' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "aircraft_model_comment_reports_comment_reporter_unique" ON "aircraft_model_comment_reports" USING btree ("comment_id","reporter_id");
