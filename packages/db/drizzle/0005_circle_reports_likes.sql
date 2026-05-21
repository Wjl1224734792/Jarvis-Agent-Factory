-- 圈子帖子举报表
CREATE TABLE circle_post_reports (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  image_file_ids JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX circle_post_reports_post_reporter_unique ON circle_post_reports(post_id, reporter_id);

-- 圈子评论举报表
CREATE TABLE circle_post_comment_reports (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  image_file_ids JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX circle_post_comment_reports_cmt_reporter_unique ON circle_post_comment_reports(comment_id, reporter_id);

-- 圈子评论点赞表
CREATE TABLE circle_post_comment_likes (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX circle_post_comment_likes_cmt_user_unique ON circle_post_comment_likes(comment_id, user_id);
