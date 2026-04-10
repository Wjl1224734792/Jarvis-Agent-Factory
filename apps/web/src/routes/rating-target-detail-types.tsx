import type { WebApiClient } from "@/lib/api-client";

export type RatingTargetDetail = Awaited<ReturnType<WebApiClient["getRatingTargetDetail"]>>["item"];
export type RatingTargetComment = RatingTargetDetail["comments"][number];
export type RatingTargetCommentReply = RatingTargetComment["replies"][number];
export type RatingTargetCommentNode = (RatingTargetComment | RatingTargetCommentReply) & {
  replies?: RatingTargetCommentReply[];
};
