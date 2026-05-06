ALTER TABLE "posts" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "ai_summary_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "ai_formatted_at" timestamp with time zone;