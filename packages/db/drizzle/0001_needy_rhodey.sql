CREATE TABLE "audit_records" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"entity_id" text NOT NULL,
	"content_type" text NOT NULL,
	"provider" text DEFAULT 'qiniu' NOT NULL,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"suggestion" text,
	"scene" text,
	"request_id" text,
	"task_id" text,
	"detail_labels" text DEFAULT '[]' NOT NULL,
	"scene_suggestions" text DEFAULT '{}' NOT NULL,
	"raw_payload" text DEFAULT '{}' NOT NULL,
	"error_message" text,
	"callback_received_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"reviewed_by" text,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_records_content_type_check" CHECK ("audit_records"."content_type" IN ('text', 'image', 'video', 'mixed')),
	CONSTRAINT "audit_records_provider_check" CHECK ("audit_records"."provider" IN ('qiniu')),
	CONSTRAINT "audit_records_mode_check" CHECK ("audit_records"."mode" IN ('ai', 'manual')),
	CONSTRAINT "audit_records_status_check" CHECK ("audit_records"."status" IN ('queued', 'running', 'passed', 'rejected', 'needs_manual_review', 'failed', 'manual_passed', 'manual_rejected'))
);
--> statement-breakpoint
CREATE INDEX "audit_records_domain_entity_idx" ON "audit_records" USING btree ("domain","entity_id");--> statement-breakpoint
CREATE INDEX "audit_records_status_idx" ON "audit_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_records_provider_idx" ON "audit_records" USING btree ("provider");