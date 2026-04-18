CREATE INDEX IF NOT EXISTS "posts_feed_status_type_published_idx"
  ON "posts" ("status", "type", "published_at", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_feed_category_status_type_idx"
  ON "posts" ("content_category_id", "status", "type", "published_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_feed_recommended_score_idx"
  ON "posts" ("status", "type", "like_count", "comment_count", "published_at");
