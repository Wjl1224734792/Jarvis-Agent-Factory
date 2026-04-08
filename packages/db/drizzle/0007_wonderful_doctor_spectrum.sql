ALTER TABLE "aircraft_models" ADD COLUMN "cover_image_file_id" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "gallery_image_file_ids" text DEFAULT '[]' NOT NULL;