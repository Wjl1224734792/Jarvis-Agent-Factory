CREATE TABLE "review_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"review_id" text NOT NULL,
	"author_id" text NOT NULL,
	"parent_comment_id" text,
	"reply_to_comment_id" text,
	"reply_to_user_id" text,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"post_id" text,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"data_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD COLUMN "video_asset_id" text;
--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_review_id_aircraft_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."aircraft_reviews"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_reply_to_user_id_users_id_fk" FOREIGN KEY ("reply_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_parent_comment_id_review_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."review_comments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_reply_to_comment_id_review_comments_id_fk" FOREIGN KEY ("reply_to_comment_id") REFERENCES "public"."review_comments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "video_assets" ADD CONSTRAINT "video_assets_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD CONSTRAINT "aircraft_submissions_video_asset_id_video_assets_id_fk" FOREIGN KEY ("video_asset_id") REFERENCES "public"."video_assets"("id") ON DELETE set null ON UPDATE no action;
