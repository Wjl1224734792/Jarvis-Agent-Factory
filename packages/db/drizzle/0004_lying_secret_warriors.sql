DROP INDEX "posts_feed_status_type_published_idx";--> statement-breakpoint
DROP INDEX "posts_feed_category_status_type_idx";--> statement-breakpoint
DROP INDEX "posts_feed_recommended_score_idx";--> statement-breakpoint
CREATE INDEX "posts_feed_status_type_seek_idx" ON "posts" USING btree ("type",coalesce("published_at", "created_at") desc,"id" DESC NULLS LAST) WHERE "posts"."status" = 'published';--> statement-breakpoint
CREATE INDEX "posts_feed_category_status_type_seek_idx" ON "posts" USING btree ("content_category_id","type",coalesce("published_at", "created_at") desc,"id" DESC NULLS LAST) WHERE "posts"."status" = 'published';