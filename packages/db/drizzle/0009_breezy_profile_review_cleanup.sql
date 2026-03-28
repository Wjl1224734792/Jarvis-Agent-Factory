ALTER TABLE "users" ADD COLUMN "avatar_url" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;
--> statement-breakpoint
ALTER TABLE "aircraft_reviews" ALTER COLUMN "rating" DROP NOT NULL;
--> statement-breakpoint
UPDATE "aircraft_reviews" SET "rating" = NULL;
