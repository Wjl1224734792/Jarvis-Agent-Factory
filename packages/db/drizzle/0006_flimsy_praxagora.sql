ALTER TABLE "rankings" DROP CONSTRAINT "rankings_status_check";--> statement-breakpoint
ALTER TABLE "rating_targets" DROP CONSTRAINT "rating_targets_status_check";--> statement-breakpoint
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_status_check" CHECK ("rankings"."status" IN ('pending', 'published', 'rejected', 'hidden'));--> statement-breakpoint
ALTER TABLE "rating_targets" ADD CONSTRAINT "rating_targets_status_check" CHECK ("rating_targets"."status" IN ('pending', 'published', 'rejected', 'hidden'));