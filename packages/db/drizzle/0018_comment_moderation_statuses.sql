ALTER TABLE "review_comments"
ADD COLUMN "status" text DEFAULT 'visible' NOT NULL;

ALTER TABLE "ranking_comments"
ADD COLUMN "status" text DEFAULT 'visible' NOT NULL;

ALTER TABLE "ranking_item_comments"
ADD COLUMN "status" text DEFAULT 'visible' NOT NULL;
