ALTER TABLE "files" ADD COLUMN "current_audit_record_id" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "current_audit_status" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "current_audit_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_current_audit_status_check" CHECK ("files"."current_audit_status" IS NULL OR "files"."current_audit_status" IN ('queued', 'running', 'passed', 'rejected', 'needs_manual_review', 'failed', 'manual_passed', 'manual_rejected'));