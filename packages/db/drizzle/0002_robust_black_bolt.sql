CREATE TABLE "aircraft_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"model_id" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"content" text,
	"status" text DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aircraft_reviews" ADD CONSTRAINT "aircraft_reviews_model_id_aircraft_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."aircraft_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aircraft_reviews" ADD CONSTRAINT "aircraft_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "aircraft_reviews_model_user_unique" ON "aircraft_reviews" USING btree ("model_id","user_id");