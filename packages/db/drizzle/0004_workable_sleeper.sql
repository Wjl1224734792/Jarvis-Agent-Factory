ALTER TABLE "aircraft_models" ADD COLUMN IF NOT EXISTS "lifecycle_status" text DEFAULT 'unreleased' NOT NULL;--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD COLUMN IF NOT EXISTS "lifecycle_status" text DEFAULT 'unreleased' NOT NULL;
