ALTER TABLE "audit_records" DROP CONSTRAINT "audit_records_mode_check";--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "moderation_modes" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_records" ADD CONSTRAINT "audit_records_mode_check" CHECK ("audit_records"."mode" IN ('ai', 'manual', 'automatic'));