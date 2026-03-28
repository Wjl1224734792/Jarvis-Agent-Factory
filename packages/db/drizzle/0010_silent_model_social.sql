CREATE TABLE "user_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "profile_visibility" text DEFAULT 'community' NOT NULL,
  "notify_comments" boolean DEFAULT true NOT NULL,
  "notify_mentions" boolean DEFAULT true NOT NULL,
  "session_alerts" boolean DEFAULT true NOT NULL,
  "email_digest" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_unique" ON "user_settings" USING btree ("user_id");
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "aircraft_model_interactions" (
  "id" text PRIMARY KEY NOT NULL,
  "model_id" text NOT NULL,
  "user_id" text NOT NULL,
  "type" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "aircraft_model_interactions_model_user_type_unique" ON "aircraft_model_interactions" USING btree ("model_id","user_id","type");
--> statement-breakpoint
ALTER TABLE "aircraft_model_interactions" ADD CONSTRAINT "aircraft_model_interactions_model_id_aircraft_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."aircraft_models"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "aircraft_model_interactions" ADD CONSTRAINT "aircraft_model_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
