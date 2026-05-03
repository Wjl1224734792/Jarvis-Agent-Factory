CREATE INDEX "posts_author_id_idx" ON "posts" USING btree ("author_id");
--> statement-breakpoint
CREATE INDEX "posts_report_count_idx" ON "posts" USING btree ("report_count");
--> statement-breakpoint
CREATE INDEX "posts_view_count_idx" ON "posts" USING btree ("view_count");
--> statement-breakpoint
CREATE INDEX "aircraft_model_interactions_user_created_at_idx" ON "aircraft_model_interactions" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "rating_targets_linked_model_id_status_idx" ON "rating_targets" USING btree ("linked_model_id", "status");
--> statement-breakpoint
CREATE INDEX "rankings_author_id_idx" ON "rankings" USING btree ("author_id");
--> statement-breakpoint
CREATE INDEX "rankings_updated_at_idx" ON "rankings" USING btree ("updated_at");
--> statement-breakpoint
CREATE INDEX "aircraft_models_is_published_idx" ON "aircraft_models" USING btree ("is_published");
