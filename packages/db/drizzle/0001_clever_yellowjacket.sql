ALTER TABLE "aircraft_models" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "max_flight_time_minutes" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "max_range_kilometers" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "max_speed_kph" integer;--> statement-breakpoint
ALTER TABLE "aircraft_models" ADD COLUMN "takeoff_weight_grams" integer;