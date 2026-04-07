CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_type" text NOT NULL,
	"device_label" text,
	"push_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cover_image_file_id" text;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "devices_user_push_token_idx" ON "devices" USING btree ("user_id","push_token");--> statement-breakpoint
ALTER TABLE "aircraft_model_comments" ADD CONSTRAINT "aircraft_model_comments_status_check" CHECK ("aircraft_model_comments"."status" IN ('pending', 'visible', 'hidden'));--> statement-breakpoint
ALTER TABLE "aircraft_reviews" ADD CONSTRAINT "aircraft_reviews_status_check" CHECK ("aircraft_reviews"."status" IN ('pending', 'visible', 'hidden'));--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD CONSTRAINT "aircraft_submissions_status_check" CHECK ("aircraft_submissions"."status" IN ('submitted', 'approved', 'rejected'));--> statement-breakpoint
ALTER TABLE "brand_applications" ADD CONSTRAINT "brand_applications_status_check" CHECK ("brand_applications"."status" IN ('pending', 'approved', 'rejected'));--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_status_check" CHECK ("files"."status" IN ('initiated', 'uploaded', 'failed', 'deleted'));--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_visibility_check" CHECK ("files"."visibility" IN ('public', 'private'));--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_media_kind_check" CHECK ("files"."media_kind" IN ('image', 'video', 'document'));--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_status_check" CHECK ("post_comments"."status" IN ('pending', 'visible', 'hidden'));--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_type_check" CHECK ("posts"."type" IN ('article', 'moment'));--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_status_check" CHECK ("posts"."status" IN ('pending', 'published', 'rejected', 'hidden'));--> statement-breakpoint
ALTER TABLE "ranking_comments" ADD CONSTRAINT "ranking_comments_status_check" CHECK ("ranking_comments"."status" IN ('pending', 'visible', 'hidden'));--> statement-breakpoint
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_type_check" CHECK ("rankings"."type" IN ('community', 'official'));--> statement-breakpoint
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_status_check" CHECK ("rankings"."status" IN ('draft', 'published', 'hidden'));--> statement-breakpoint
ALTER TABLE "rating_target_comments" ADD CONSTRAINT "rating_target_comments_status_check" CHECK ("rating_target_comments"."status" IN ('pending', 'visible', 'hidden'));--> statement-breakpoint
ALTER TABLE "rating_targets" ADD CONSTRAINT "rating_targets_status_check" CHECK ("rating_targets"."status" IN ('draft', 'published', 'hidden'));--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_status_check" CHECK ("review_comments"."status" IN ('pending', 'visible', 'hidden'));--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_scope_check" CHECK ("sessions"."scope" IN ('web', 'app', 'admin'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('user', 'admin'));