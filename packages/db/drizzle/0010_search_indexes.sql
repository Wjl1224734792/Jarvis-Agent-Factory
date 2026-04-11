CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_display_name_trgm_idx ON "users" USING gin ("display_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS users_role_created_at_idx ON "users" ("role", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS user_settings_visibility_user_idx ON "user_settings" ("profile_visibility", "user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS posts_status_type_published_at_idx ON "posts" ("status", "type", "published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS posts_author_status_idx ON "posts" ("author_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS posts_category_status_published_at_idx ON "posts" ("content_category_id", "status", "published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS posts_title_trgm_idx ON "posts" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS posts_plain_text_trgm_idx ON "posts" USING gin ("content_plain_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS post_comments_post_status_created_idx ON "post_comments" ("post_id", "status", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS post_comments_author_status_idx ON "post_comments" ("author_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS post_comments_parent_status_idx ON "post_comments" ("parent_comment_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS post_comments_content_trgm_idx ON "post_comments" USING gin ("content" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS brands_category_enabled_sort_idx ON "brands" ("category_id", "is_enabled", "sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS brands_name_trgm_idx ON "brands" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS brand_app_status_updated_idx ON "brand_applications" ("status", "updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS brand_app_applicant_status_idx ON "brand_applications" ("applicant_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS brand_app_name_trgm_idx ON "brand_applications" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS brand_app_slug_trgm_idx ON "brand_applications" USING gin ("slug" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_models_published_category_brand_idx ON "aircraft_models" ("is_published", "category_id", "brand_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_models_lifecycle_published_idx ON "aircraft_models" ("lifecycle_status", "is_published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_models_name_trgm_idx ON "aircraft_models" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_models_summary_trgm_idx ON "aircraft_models" USING gin ("summary" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_models_description_trgm_idx ON "aircraft_models" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_submissions_status_updated_idx ON "aircraft_submissions" ("status", "updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_submissions_author_status_idx ON "aircraft_submissions" ("author_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_submissions_category_status_idx ON "aircraft_submissions" ("category_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_submissions_brand_status_idx ON "aircraft_submissions" ("brand_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_submissions_model_name_trgm_idx ON "aircraft_submissions" USING gin ("model_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_submissions_proposed_brand_trgm_idx ON "aircraft_submissions" USING gin ("proposed_brand_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_submissions_summary_trgm_idx ON "aircraft_submissions" USING gin ("summary" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_reviews_model_status_created_idx ON "aircraft_reviews" ("model_id", "status", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_reviews_user_status_idx ON "aircraft_reviews" ("user_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_reviews_content_trgm_idx ON "aircraft_reviews" USING gin ("content" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_model_comments_model_status_created_idx ON "aircraft_model_comments" ("model_id", "status", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_model_comments_author_status_idx ON "aircraft_model_comments" ("author_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_model_comments_parent_status_idx ON "aircraft_model_comments" ("parent_comment_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS aircraft_model_comments_content_trgm_idx ON "aircraft_model_comments" USING gin ("content" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rankings_type_status_created_idx ON "rankings" ("type", "status", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rankings_author_status_idx ON "rankings" ("author_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rankings_title_trgm_idx ON "rankings" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rankings_description_trgm_idx ON "rankings" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rating_targets_ranking_status_rank_idx ON "rating_targets" ("ranking_id", "status", "rank");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rating_targets_linked_model_status_idx ON "rating_targets" ("linked_model_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rating_targets_title_trgm_idx ON "rating_targets" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rating_targets_summary_trgm_idx ON "rating_targets" USING gin ("summary" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rating_targets_brand_name_trgm_idx ON "rating_targets" USING gin ("brand_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ranking_comments_ranking_status_created_idx ON "ranking_comments" ("ranking_id", "status", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ranking_comments_author_status_idx ON "ranking_comments" ("author_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ranking_comments_content_trgm_idx ON "ranking_comments" USING gin ("content" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rating_target_comments_target_status_created_idx ON "rating_target_comments" ("rating_target_id", "status", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rating_target_comments_author_status_idx ON "rating_target_comments" ("author_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rating_target_comments_content_trgm_idx ON "rating_target_comments" USING gin ("content" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS review_comments_review_status_created_idx ON "review_comments" ("review_id", "status", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS review_comments_author_status_idx ON "review_comments" ("author_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS review_comments_content_trgm_idx ON "review_comments" USING gin ("content" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS notifications_user_read_created_idx ON "notifications" ("user_id", "is_read", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_user_scope_expires_idx ON "sessions" ("user_id", "scope", "expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_access_expires_idx ON "sessions" ("access_expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS files_owner_biz_status_created_idx ON "files" ("owner_id", "biz_type", "status", "created_at");
