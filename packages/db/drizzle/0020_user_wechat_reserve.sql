ALTER TABLE "users"
ADD COLUMN "wechat_open_id" text,
ADD COLUMN "wechat_union_id" text;

CREATE UNIQUE INDEX "users_wechat_open_id_unique"
ON "users" ("wechat_open_id");

CREATE UNIQUE INDEX "users_wechat_union_id_unique"
ON "users" ("wechat_union_id");
