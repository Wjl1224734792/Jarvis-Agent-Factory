ALTER TABLE "aircraft_models" ADD COLUMN IF NOT EXISTS "cover_image_file_id" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN IF NOT EXISTS "gallery_image_file_ids" text DEFAULT '[]' NOT NULL;
