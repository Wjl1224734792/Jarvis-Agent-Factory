CREATE TABLE "aircraft_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aircraft_model_comment_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aircraft_model_comment_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"image_file_ids" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aircraft_model_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"model_id" text NOT NULL,
	"author_id" text NOT NULL,
	"parent_comment_id" text,
	"reply_to_comment_id" text,
	"reply_to_user_id" text,
	"content" text NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aircraft_model_comments_status_check" CHECK ("aircraft_model_comments"."status" IN ('pending', 'visible', 'hidden'))
);
--> statement-breakpoint
CREATE TABLE "aircraft_model_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"model_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aircraft_model_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"model_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"image_file_ids" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aircraft_models" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"owner_id" text,
	"source_submission_id" text,
	"power_type" text NOT NULL,
	"lifecycle_status" text DEFAULT 'unreleased' NOT NULL,
	"summary" text,
	"description" text,
	"price_min" integer,
	"price_max" integer,
	"max_flight_time_minutes" integer,
	"max_range_kilometers" integer,
	"max_speed_kph" integer,
	"takeoff_weight_grams" integer,
	"cover_image_file_id" text,
	"gallery_image_file_ids" text DEFAULT '[]' NOT NULL,
	"video_file_id" text,
	"report_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aircraft_review_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"review_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aircraft_review_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"review_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"image_file_ids" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aircraft_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"model_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer,
	"content" text,
	"status" text DEFAULT 'visible' NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aircraft_reviews_status_check" CHECK ("aircraft_reviews"."status" IN ('pending', 'visible', 'hidden'))
);
--> statement-breakpoint
CREATE TABLE "aircraft_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"category_id" text NOT NULL,
	"brand_id" text,
	"proposed_brand_name" text,
	"model_name" text NOT NULL,
	"power_type" text NOT NULL,
	"lifecycle_status" text DEFAULT 'unreleased' NOT NULL,
	"summary" text,
	"description" text,
	"price_min" integer,
	"price_max" integer,
	"rejection_reason" text,
	"cover_image_file_id" text,
	"gallery_image_file_ids" text DEFAULT '[]' NOT NULL,
	"video_file_id" text,
	"max_flight_time_minutes" integer,
	"max_range_kilometers" integer,
	"max_speed_kph" integer,
	"takeoff_weight_grams" integer,
	"approved_model_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aircraft_submissions_status_check" CHECK ("aircraft_submissions"."status" IN ('submitted', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "brand_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"applicant_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"description" text,
	"rejection_reason" text,
	"approved_brand_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_applications_status_check" CHECK ("brand_applications"."status" IN ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"category_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "files" (
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
	"deleted_at" timestamp with time zone,
	CONSTRAINT "files_status_check" CHECK ("files"."status" IN ('pending', 'uploaded', 'failed', 'deleted')),
	CONSTRAINT "files_visibility_check" CHECK ("files"."visibility" IN ('public', 'private')),
	CONSTRAINT "files_media_kind_check" CHECK ("files"."media_kind" IN ('image', 'video', 'document'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"actor_id" text,
	"category" text DEFAULT 'comments_and_mentions' NOT NULL,
	"type" text NOT NULL,
	"target_type" text DEFAULT 'status' NOT NULL,
	"target_id" text DEFAULT 'status' NOT NULL,
	"target_title" text DEFAULT '状态更新' NOT NULL,
	"target_status" text,
	"title" text DEFAULT '系统消息' NOT NULL,
	"summary" text DEFAULT '状态已更新' NOT NULL,
	"preview" text,
	"metadata" text DEFAULT '{}' NOT NULL,
	"post_id" text,
	"comment_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_comment_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_comment_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"image_file_ids" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"author_id" text NOT NULL,
	"parent_comment_id" text,
	"reply_to_comment_id" text,
	"reply_to_user_id" text,
	"content" text NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_comments_status_check" CHECK ("post_comments"."status" IN ('pending', 'visible', 'hidden'))
);
--> statement-breakpoint
CREATE TABLE "post_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"image_file_ids" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"type" text DEFAULT 'moment' NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"content_plain_text" text,
	"content_category_id" text,
	"cover_image_file_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"favorite_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_type_check" CHECK ("posts"."type" IN ('article', 'moment')),
	CONSTRAINT "posts_status_check" CHECK ("posts"."status" IN ('pending', 'published', 'rejected', 'hidden'))
);
--> statement-breakpoint
CREATE TABLE "ranking_comment_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranking_comment_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"image_file_ids" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranking_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"ranking_id" text NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ranking_comments_status_check" CHECK ("ranking_comments"."status" IN ('pending', 'visible', 'hidden'))
);
--> statement-breakpoint
CREATE TABLE "ranking_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"ranking_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"image_file_ids" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rankings" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"type" text DEFAULT 'community' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"rejection_reason" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"cover_image_file_id" text,
	"item_add_policy" text DEFAULT 'owner' NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rankings_type_check" CHECK ("rankings"."type" IN ('community', 'official')),
	CONSTRAINT "rankings_status_check" CHECK ("rankings"."status" IN ('pending', 'published', 'rejected', 'hidden'))
);
--> statement-breakpoint
CREATE TABLE "rating_target_comment_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_target_comment_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"image_file_ids" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_target_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"rating_target_id" text NOT NULL,
	"author_id" text NOT NULL,
	"parent_comment_id" text,
	"reply_to_comment_id" text,
	"reply_to_user_id" text,
	"content" text NOT NULL,
	"rating" integer,
	"status" text DEFAULT 'visible' NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rating_target_comments_status_check" CHECK ("rating_target_comments"."status" IN ('pending', 'visible', 'hidden'))
);
--> statement-breakpoint
CREATE TABLE "rating_target_ratings" (
	"id" text PRIMARY KEY NOT NULL,
	"rating_target_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_target_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"rating_target_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"image_file_ids" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_targets" (
	"id" text PRIMARY KEY NOT NULL,
	"ranking_id" text NOT NULL,
	"author_id" text NOT NULL,
	"linked_model_id" text,
	"status" text DEFAULT 'published' NOT NULL,
	"rejection_reason" text,
	"rank" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"image_file_id" text,
	"brand_name" text,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rating_targets_status_check" CHECK ("rating_targets"."status" IN ('pending', 'published', 'rejected', 'hidden'))
);
--> statement-breakpoint
CREATE TABLE "review_comment_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_comment_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"image_file_ids" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"review_id" text NOT NULL,
	"author_id" text NOT NULL,
	"parent_comment_id" text,
	"reply_to_comment_id" text,
	"reply_to_user_id" text,
	"content" text NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_comments_status_check" CHECK ("review_comments"."status" IN ('pending', 'visible', 'hidden'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"scope" text NOT NULL,
	"client_ip" text,
	"user_agent" text,
	"device_label" text,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"refresh_token_hash" text,
	"refresh_expires_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"access_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_scope_check" CHECK ("sessions"."scope" IN ('web', 'app', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"post_moderation_enabled" boolean DEFAULT true NOT NULL,
	"comment_moderation_enabled" boolean DEFAULT false NOT NULL,
	"review_moderation_enabled" boolean DEFAULT false NOT NULL,
	"submission_moderation_enabled" boolean DEFAULT true NOT NULL,
	"ranking_moderation_enabled" boolean DEFAULT false NOT NULL,
	"article_moderation_enabled" boolean DEFAULT true NOT NULL,
	"moment_moderation_enabled" boolean DEFAULT true NOT NULL,
	"brand_moderation_enabled" boolean DEFAULT true NOT NULL,
	"model_moderation_enabled" boolean DEFAULT true NOT NULL,
	"rating_target_moderation_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" text PRIMARY KEY NOT NULL,
	"follower_id" text NOT NULL,
	"followee_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"profile_visibility" text DEFAULT 'community' NOT NULL,
	"notify_comments" boolean DEFAULT true NOT NULL,
	"notify_mentions" boolean DEFAULT true NOT NULL,
	"session_alerts" boolean DEFAULT true NOT NULL,
	"email_digest" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_file_id" text,
	"cover_image_file_id" text,
	"bio" text,
	"phone" text,
	"wechat_open_id" text,
	"wechat_union_id" text,
	"account" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('user', 'admin'))
);
--> statement-breakpoint
ALTER TABLE "aircraft_model_comment_likes" ADD CONSTRAINT "aircraft_model_comment_likes_comment_id_aircraft_model_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."aircraft_model_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_model_comment_likes" ADD CONSTRAINT "aircraft_model_comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_model_comment_reports" ADD CONSTRAINT "aircraft_model_comment_reports_comment_id_aircraft_model_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."aircraft_model_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_model_comment_reports" ADD CONSTRAINT "aircraft_model_comment_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_model_comments" ADD CONSTRAINT "aircraft_model_comments_model_id_aircraft_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."aircraft_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_model_comments" ADD CONSTRAINT "aircraft_model_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_model_comments" ADD CONSTRAINT "aircraft_model_comments_reply_to_user_id_users_id_fk" FOREIGN KEY ("reply_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_model_comments" ADD CONSTRAINT "aircraft_model_comments_parent_comment_id_aircraft_model_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."aircraft_model_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_model_comments" ADD CONSTRAINT "aircraft_model_comments_reply_to_comment_id_aircraft_model_comments_id_fk" FOREIGN KEY ("reply_to_comment_id") REFERENCES "public"."aircraft_model_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_model_interactions" ADD CONSTRAINT "aircraft_model_interactions_model_id_aircraft_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."aircraft_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_model_interactions" ADD CONSTRAINT "aircraft_model_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_model_reports" ADD CONSTRAINT "aircraft_model_reports_model_id_aircraft_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."aircraft_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_model_reports" ADD CONSTRAINT "aircraft_model_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD CONSTRAINT "aircraft_models_category_id_aircraft_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."aircraft_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD CONSTRAINT "aircraft_models_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD CONSTRAINT "aircraft_models_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_review_likes" ADD CONSTRAINT "aircraft_review_likes_review_id_aircraft_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."aircraft_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_review_likes" ADD CONSTRAINT "aircraft_review_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_review_reports" ADD CONSTRAINT "aircraft_review_reports_review_id_aircraft_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."aircraft_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_review_reports" ADD CONSTRAINT "aircraft_review_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_reviews" ADD CONSTRAINT "aircraft_reviews_model_id_aircraft_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."aircraft_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_reviews" ADD CONSTRAINT "aircraft_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD CONSTRAINT "aircraft_submissions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD CONSTRAINT "aircraft_submissions_category_id_aircraft_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."aircraft_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD CONSTRAINT "aircraft_submissions_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD CONSTRAINT "aircraft_submissions_approved_model_id_aircraft_models_id_fk" FOREIGN KEY ("approved_model_id") REFERENCES "public"."aircraft_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_applications" ADD CONSTRAINT "brand_applications_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_applications" ADD CONSTRAINT "brand_applications_approved_brand_id_brands_id_fk" FOREIGN KEY ("approved_brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_category_id_aircraft_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."aircraft_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comment_likes" ADD CONSTRAINT "post_comment_likes_comment_id_post_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comment_likes" ADD CONSTRAINT "post_comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comment_reports" ADD CONSTRAINT "post_comment_reports_comment_id_post_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comment_reports" ADD CONSTRAINT "post_comment_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_reply_to_user_id_users_id_fk" FOREIGN KEY ("reply_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parent_comment_id_post_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_reply_to_comment_id_post_comments_id_fk" FOREIGN KEY ("reply_to_comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_interactions" ADD CONSTRAINT "post_interactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_interactions" ADD CONSTRAINT "post_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_content_category_id_content_categories_id_fk" FOREIGN KEY ("content_category_id") REFERENCES "public"."content_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_comment_likes" ADD CONSTRAINT "ranking_comment_likes_comment_id_ranking_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."ranking_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_comment_likes" ADD CONSTRAINT "ranking_comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_comment_reports" ADD CONSTRAINT "ranking_comment_reports_comment_id_ranking_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."ranking_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_comment_reports" ADD CONSTRAINT "ranking_comment_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_comments" ADD CONSTRAINT "ranking_comments_ranking_id_rankings_id_fk" FOREIGN KEY ("ranking_id") REFERENCES "public"."rankings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_comments" ADD CONSTRAINT "ranking_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_reports" ADD CONSTRAINT "ranking_reports_ranking_id_rankings_id_fk" FOREIGN KEY ("ranking_id") REFERENCES "public"."rankings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_reports" ADD CONSTRAINT "ranking_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_target_comment_likes" ADD CONSTRAINT "rating_target_comment_likes_comment_id_rating_target_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."rating_target_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_target_comment_likes" ADD CONSTRAINT "rating_target_comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_target_comment_reports" ADD CONSTRAINT "rating_target_comment_reports_comment_id_rating_target_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."rating_target_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_target_comment_reports" ADD CONSTRAINT "rating_target_comment_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_target_comments" ADD CONSTRAINT "rating_target_comments_rating_target_id_rating_targets_id_fk" FOREIGN KEY ("rating_target_id") REFERENCES "public"."rating_targets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_target_comments" ADD CONSTRAINT "rating_target_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_target_comments" ADD CONSTRAINT "rating_target_comments_reply_to_user_id_users_id_fk" FOREIGN KEY ("reply_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_target_comments" ADD CONSTRAINT "rating_target_comments_parent_comment_id_rating_target_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."rating_target_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_target_comments" ADD CONSTRAINT "rating_target_comments_reply_to_comment_id_rating_target_comments_id_fk" FOREIGN KEY ("reply_to_comment_id") REFERENCES "public"."rating_target_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_target_ratings" ADD CONSTRAINT "rating_target_ratings_rating_target_id_rating_targets_id_fk" FOREIGN KEY ("rating_target_id") REFERENCES "public"."rating_targets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_target_ratings" ADD CONSTRAINT "rating_target_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_target_reports" ADD CONSTRAINT "rating_target_reports_rating_target_id_rating_targets_id_fk" FOREIGN KEY ("rating_target_id") REFERENCES "public"."rating_targets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_target_reports" ADD CONSTRAINT "rating_target_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_targets" ADD CONSTRAINT "rating_targets_ranking_id_rankings_id_fk" FOREIGN KEY ("ranking_id") REFERENCES "public"."rankings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_targets" ADD CONSTRAINT "rating_targets_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_targets" ADD CONSTRAINT "rating_targets_linked_model_id_aircraft_models_id_fk" FOREIGN KEY ("linked_model_id") REFERENCES "public"."aircraft_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comment_likes" ADD CONSTRAINT "review_comment_likes_comment_id_review_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."review_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comment_likes" ADD CONSTRAINT "review_comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comment_reports" ADD CONSTRAINT "review_comment_reports_comment_id_review_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."review_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comment_reports" ADD CONSTRAINT "review_comment_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_review_id_aircraft_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."aircraft_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_reply_to_user_id_users_id_fk" FOREIGN KEY ("reply_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_parent_comment_id_review_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."review_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_reply_to_comment_id_review_comments_id_fk" FOREIGN KEY ("reply_to_comment_id") REFERENCES "public"."review_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followee_id_users_id_fk" FOREIGN KEY ("followee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "aircraft_categories_slug_unique" ON "aircraft_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "aircraft_model_comment_likes_comment_user_unique" ON "aircraft_model_comment_likes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "aircraft_model_comment_reports_comment_reporter_unique" ON "aircraft_model_comment_reports" USING btree ("comment_id","reporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "aircraft_model_interactions_model_user_type_unique" ON "aircraft_model_interactions" USING btree ("model_id","user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "aircraft_model_reports_model_reporter_unique" ON "aircraft_model_reports" USING btree ("model_id","reporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "aircraft_models_slug_unique" ON "aircraft_models" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "aircraft_review_likes_review_user_unique" ON "aircraft_review_likes" USING btree ("review_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "aircraft_review_reports_review_reporter_unique" ON "aircraft_review_reports" USING btree ("review_id","reporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "aircraft_reviews_model_user_unique" ON "aircraft_reviews" USING btree ("model_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_slug_unique" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "content_categories_slug_unique" ON "content_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "devices_user_push_token_idx" ON "devices" USING btree ("user_id","push_token");--> statement-breakpoint
CREATE UNIQUE INDEX "post_comment_likes_comment_user_unique" ON "post_comment_likes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_comment_reports_comment_reporter_unique" ON "post_comment_reports" USING btree ("comment_id","reporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_interactions_post_user_type_unique" ON "post_interactions" USING btree ("post_id","user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "post_reports_post_reporter_unique" ON "post_reports" USING btree ("post_id","reporter_id");--> statement-breakpoint
CREATE INDEX "posts_feed_status_type_published_idx" ON "posts" USING btree ("status","type","published_at","created_at");--> statement-breakpoint
CREATE INDEX "posts_feed_category_status_type_idx" ON "posts" USING btree ("content_category_id","status","type","published_at");--> statement-breakpoint
CREATE INDEX "posts_feed_recommended_score_idx" ON "posts" USING btree ("status","type","like_count","comment_count","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_comment_likes_comment_user_unique" ON "ranking_comment_likes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_comment_reports_comment_reporter_unique" ON "ranking_comment_reports" USING btree ("comment_id","reporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_reports_ranking_reporter_unique" ON "ranking_reports" USING btree ("ranking_id","reporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_target_comment_likes_comment_user_unique" ON "rating_target_comment_likes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_target_comment_reports_comment_reporter_unique" ON "rating_target_comment_reports" USING btree ("comment_id","reporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_target_ratings_target_user_unique" ON "rating_target_ratings" USING btree ("rating_target_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_target_reports_target_reporter_unique" ON "rating_target_reports" USING btree ("rating_target_id","reporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_comment_likes_comment_user_unique" ON "review_comment_likes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_comment_reports_comment_reporter_unique" ON "review_comment_reports" USING btree ("comment_id","reporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_follows_follower_followee_unique" ON "user_follows" USING btree ("follower_id","followee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_unique" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_display_name_unique" ON "users" USING btree ("display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "users_wechat_open_id_unique" ON "users" USING btree ("wechat_open_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_wechat_union_id_unique" ON "users" USING btree ("wechat_union_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_account_unique" ON "users" USING btree ("account");