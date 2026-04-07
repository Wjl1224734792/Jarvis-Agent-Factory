CREATE TABLE IF NOT EXISTS "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_type" text NOT NULL,
	"device_label" text,
	"push_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "devices_user_push_token_idx" ON "devices" USING btree ("user_id","push_token");
