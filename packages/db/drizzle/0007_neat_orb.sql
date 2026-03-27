ALTER TABLE "aircraft_submissions" ADD COLUMN "category_id" text;
--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD COLUMN "brand_id" text;
--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD COLUMN "proposed_brand_name" text;
--> statement-breakpoint
UPDATE "aircraft_submissions"
SET "category_id" = COALESCE(
  (
    SELECT "id"
    FROM "aircraft_categories"
    WHERE "name" = "aircraft_submissions"."aircraft_type"
    LIMIT 1
  ),
  (
    SELECT "id"
    FROM "aircraft_categories"
    ORDER BY "sort_order", "name"
    LIMIT 1
  )
)
WHERE "category_id" IS NULL;
--> statement-breakpoint
UPDATE "aircraft_submissions"
SET "brand_id" = (
  SELECT "b"."id"
  FROM "brands" AS "b"
  WHERE "b"."name" = "aircraft_submissions"."brand_name"
    AND (
      "b"."category_id" = "aircraft_submissions"."category_id"
      OR "b"."category_id" IS NULL
    )
  ORDER BY
    CASE
      WHEN "b"."category_id" = "aircraft_submissions"."category_id" THEN 0
      ELSE 1
    END,
    "b"."sort_order",
    "b"."name"
  LIMIT 1
)
WHERE "brand_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ALTER COLUMN "category_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD CONSTRAINT "aircraft_submissions_category_id_aircraft_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."aircraft_categories"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "aircraft_submissions" ADD CONSTRAINT "aircraft_submissions_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "aircraft_submissions" DROP COLUMN "brand_name";
--> statement-breakpoint
ALTER TABLE "aircraft_submissions" DROP COLUMN "aircraft_type";
