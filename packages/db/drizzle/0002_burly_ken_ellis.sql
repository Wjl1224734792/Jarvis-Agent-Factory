CREATE TABLE "circle_category_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"circle_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_members" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circle_members_role_check" CHECK ("circle_members"."role" IN ('owner', 'admin', 'member'))
);
--> statement-breakpoint
CREATE TABLE "circle_post_comments" (
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
	CONSTRAINT "circle_post_comments_status_check" CHECK ("circle_post_comments"."status" IN ('pending', 'visible', 'hidden'))
);
--> statement-breakpoint
CREATE TABLE "circle_post_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circle_post_interactions_type_check" CHECK ("circle_post_interactions"."type" IN ('like', 'favorite', 'share'))
);
--> statement-breakpoint
CREATE TABLE "circle_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"circle_id" text NOT NULL,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"images" text DEFAULT '[]' NOT NULL,
	"videos" text DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"hot_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circle_posts_status_check" CHECK ("circle_posts"."status" IN ('published', 'hidden', 'deleted'))
);
--> statement-breakpoint
CREATE TABLE "circle_user_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circles" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cover_image_file_id" text,
	"owner_id" text NOT NULL,
	"join_mode" text DEFAULT 'free' NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circles_join_mode_check" CHECK ("circles"."join_mode" IN ('free', 'audit'))
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"name" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_role_check";--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "cruise_speed_kph" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "wingspan_mm" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "length_mm" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "height_mm" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "max_altitude_m" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "climb_rate_ms" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "wind_resistance" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "motor_type" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "battery_type" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "battery_capacity_mah" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "battery_voltage" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "battery_energy_wh" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "charge_time_minutes" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "propeller_size" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "obstacle_avoidance" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "gnss_type" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "ip_rating" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "operating_temperature" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "camera_sensor_size" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "camera_pixels" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "video_resolution" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "lens_aperture" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "iso_range" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "transmission_system" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "transmission_range_m" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "certification_type" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "noise_level_db" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "material_type" text;--> statement-breakpoint
CREATE UNIQUE INDEX "circle_category_assignments_category_circle_unique" ON "circle_category_assignments" USING btree ("category_id","circle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "circle_members_circle_user_unique" ON "circle_members" USING btree ("circle_id","user_id");--> statement-breakpoint
CREATE INDEX "circle_members_user_id_idx" ON "circle_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "circle_post_interactions_post_user_type_unique" ON "circle_post_interactions" USING btree ("post_id","user_id","type");--> statement-breakpoint
CREATE INDEX "circle_posts_circle_id_idx" ON "circle_posts" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "circle_posts_author_id_idx" ON "circle_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "circle_posts_hot_score_idx" ON "circle_posts" USING btree ("hot_score");--> statement-breakpoint
CREATE INDEX "circle_posts_created_at_idx" ON "circle_posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "circle_user_categories_user_id_idx" ON "circle_user_categories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "circles_slug_unique" ON "circles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "circles_owner_id_idx" ON "circles" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('user', 'admin', 'super_admin', 'editor', 'moderator', 'operator'));