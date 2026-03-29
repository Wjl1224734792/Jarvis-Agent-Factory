CREATE TABLE IF NOT EXISTS "files" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_id" text NOT NULL,
  "post_id" text,
  "biz_type" text NOT NULL,
  "media_kind" text NOT NULL,
  "provider" text NOT NULL,
  "bucket" text NOT NULL,
  "region" text,
  "object_key" text NOT NULL,
  "filename" text NOT NULL,
  "content_type" text NOT NULL,
  "size" integer NOT NULL,
  "etag" text,
  "status" text NOT NULL,
  "visibility" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "uploaded_at" timestamp with time zone,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "files"
  ADD CONSTRAINT "files_owner_id_users_id_fk"
  FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "files"
  ADD CONSTRAINT "files_post_id_posts_id_fk"
  FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_file_id" text;
--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD COLUMN IF NOT EXISTS "cover_image_file_id" text;
--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD COLUMN IF NOT EXISTS "gallery_image_file_ids" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD COLUMN IF NOT EXISTS "video_file_id" text;
--> statement-breakpoint
ALTER TABLE "rankings" ADD COLUMN IF NOT EXISTS "cover_image_file_id" text;
--> statement-breakpoint
ALTER TABLE "ranking_items" ADD COLUMN IF NOT EXISTS "image_file_id" text;
