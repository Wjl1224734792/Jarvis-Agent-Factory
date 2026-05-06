CREATE TABLE "ai_rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"counter" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_requests_status_check" CHECK ("ai_requests"."status" IN ('processing', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE INDEX "ai_requests_user_action_idx" ON "ai_requests" USING btree ("user_id","action");