ALTER TABLE "rankings" ADD COLUMN "item_add_policy" text DEFAULT 'owner' NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "ranking_item_comments_item_author_unique" ON "ranking_item_comments" USING btree ("ranking_item_id","author_id");
