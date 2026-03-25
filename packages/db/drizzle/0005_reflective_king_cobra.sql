CREATE TABLE "aircraft_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"brand_name" text NOT NULL,
	"model_name" text NOT NULL,
	"aircraft_type" text NOT NULL,
	"power_type" text NOT NULL,
	"summary" text,
	"description" text,
	"cover_image_url" text,
	"gallery_image_urls" text DEFAULT '[]' NOT NULL,
	"video_url" text,
	"max_flight_time_minutes" integer,
	"max_range_kilometers" integer,
	"max_speed_kph" integer,
	"takeoff_weight_grams" integer,
	"approved_model_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "ranking_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"ranking_id" text NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranking_item_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"ranking_item_id" text NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranking_item_ratings" (
	"id" text PRIMARY KEY NOT NULL,
	"ranking_item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranking_items" (
	"id" text PRIMARY KEY NOT NULL,
	"ranking_id" text NOT NULL,
	"linked_model_id" text,
	"rank" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"image_url" text,
	"brand_name" text,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rankings" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"type" text DEFAULT 'community' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"cover_image_url" text,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_comments" ADD COLUMN "reply_to_comment_id" text;--> statement-breakpoint
ALTER TABLE "post_comments" ADD COLUMN "reply_to_user_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "type" text DEFAULT 'moment' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "content_html" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "content_plain_text" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "content_category_id" text;--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD CONSTRAINT "aircraft_submissions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD CONSTRAINT "aircraft_submissions_approved_model_id_aircraft_models_id_fk" FOREIGN KEY ("approved_model_id") REFERENCES "public"."aircraft_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_comments" ADD CONSTRAINT "ranking_comments_ranking_id_rankings_id_fk" FOREIGN KEY ("ranking_id") REFERENCES "public"."rankings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_comments" ADD CONSTRAINT "ranking_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item_comments" ADD CONSTRAINT "ranking_item_comments_ranking_item_id_ranking_items_id_fk" FOREIGN KEY ("ranking_item_id") REFERENCES "public"."ranking_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item_comments" ADD CONSTRAINT "ranking_item_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item_ratings" ADD CONSTRAINT "ranking_item_ratings_ranking_item_id_ranking_items_id_fk" FOREIGN KEY ("ranking_item_id") REFERENCES "public"."ranking_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_item_ratings" ADD CONSTRAINT "ranking_item_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_items" ADD CONSTRAINT "ranking_items_ranking_id_rankings_id_fk" FOREIGN KEY ("ranking_id") REFERENCES "public"."rankings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_items" ADD CONSTRAINT "ranking_items_linked_model_id_aircraft_models_id_fk" FOREIGN KEY ("linked_model_id") REFERENCES "public"."aircraft_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_categories_slug_unique" ON "content_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_item_ratings_item_user_unique" ON "ranking_item_ratings" USING btree ("ranking_item_id","user_id");--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_reply_to_user_id_users_id_fk" FOREIGN KEY ("reply_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_reply_to_comment_id_post_comments_id_fk" FOREIGN KEY ("reply_to_comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_content_category_id_content_categories_id_fk" FOREIGN KEY ("content_category_id") REFERENCES "public"."content_categories"("id") ON DELETE set null ON UPDATE no action;