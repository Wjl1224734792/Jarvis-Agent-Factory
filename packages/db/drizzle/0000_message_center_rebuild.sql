ALTER TABLE "notifications"
  ALTER COLUMN "actor_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "category" text NOT NULL DEFAULT 'comments_and_mentions';
--> statement-breakpoint
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "target_type" text NOT NULL DEFAULT 'status';
--> statement-breakpoint
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "target_id" text NOT NULL DEFAULT 'status';
--> statement-breakpoint
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "target_title" text NOT NULL DEFAULT 'Status update';
--> statement-breakpoint
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "target_status" text;
--> statement-breakpoint
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "title" text NOT NULL DEFAULT 'System message';
--> statement-breakpoint
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "summary" text NOT NULL DEFAULT 'Status updated';
--> statement-breakpoint
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "preview" text;
--> statement-breakpoint
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "metadata" text NOT NULL DEFAULT '{}';
--> statement-breakpoint
UPDATE "notifications"
SET
  "category" = CASE
    WHEN "type" = 'followed' THEN 'new_followers'
    WHEN "type" IN ('post_liked', 'post_favorited', 'post_shared') THEN 'likes_and_favorites'
    ELSE 'comments_and_mentions'
  END,
  "target_type" = CASE
    WHEN "type" = 'followed' THEN 'user'
    WHEN "comment_id" IS NOT NULL THEN 'comment'
    WHEN "post_id" IS NOT NULL THEN 'post'
    ELSE 'status'
  END,
  "target_id" = COALESCE("comment_id", "post_id", "actor_id", "id"),
  "target_title" = COALESCE("title", 'Legacy notification'),
  "title" = CASE
    WHEN "type" = 'followed' THEN '新增关注'
    WHEN "type" = 'post_liked' THEN '收到新的点赞'
    WHEN "type" = 'post_favorited' THEN '收到新的收藏'
    WHEN "type" = 'post_shared' THEN '内容被分享'
    WHEN "type" = 'post_commented' THEN '收到新的评论'
    WHEN "type" = 'comment_replied' THEN '收到新的回复'
    ELSE '系统消息'
  END,
  "summary" = CASE
    WHEN "type" = 'followed' THEN '你收到了新的关注提醒'
    WHEN "type" = 'post_liked' THEN '有人点赞了你的内容'
    WHEN "type" = 'post_favorited' THEN '有人收藏了你的内容'
    WHEN "type" = 'post_shared' THEN '有人分享了你的内容'
    WHEN "type" = 'post_commented' THEN '有人评论了你的内容'
    WHEN "type" = 'comment_replied' THEN '有人回复了你的评论'
    ELSE '系统消息已更新'
  END,
  "metadata" = CASE
    WHEN "type" = 'followed' AND "actor_id" IS NOT NULL THEN '{"href":"/users/' || "actor_id" || '"}'
    WHEN "post_id" IS NOT NULL THEN '{"href":"/posts/' || "post_id" || '"}'
    ELSE '{}'
  END;
