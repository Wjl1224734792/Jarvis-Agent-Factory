ALTER TABLE "aircraft_models" ADD COLUMN "price_min" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "price_max" integer;--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD COLUMN "price_min" integer;--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD COLUMN "price_max" integer;