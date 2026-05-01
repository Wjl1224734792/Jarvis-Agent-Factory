ALTER TABLE "posts" ADD COLUMN "content_source_type" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "source_usage_flags" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "source_description" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "ai_use_level" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "ai_generated_modalities" text;
