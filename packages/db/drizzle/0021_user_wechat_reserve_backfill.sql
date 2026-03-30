ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "wechat_open_id" text,
ADD COLUMN IF NOT EXISTS "wechat_union_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "users_wechat_open_id_unique"
ON "users" ("wechat_open_id");

CREATE UNIQUE INDEX IF NOT EXISTS "users_wechat_union_id_unique"
ON "users" ("wechat_union_id");
