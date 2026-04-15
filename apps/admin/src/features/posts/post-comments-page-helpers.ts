export const commentDomains = [
  "post",
  "review",
  "model",
  "ranking",
  "rating-target"
] as const;

export type CommentDomain = (typeof commentDomains)[number];
export type AdminCommentStatus = "all" | "pending" | "visible" | "hidden";

export function shouldEnableAdminCommentQuery(
  activeDomain: CommentDomain,
  queryDomain: CommentDomain
) {
  return activeDomain === queryDomain;
}

export function buildAdminCommentQueryKey(
  domain: CommentDomain,
  status: AdminCommentStatus
) {
  return ["admin-comments", domain, status] as const;
}

export function countPendingAdminComments<T extends { status: "pending" | "visible" | "hidden" }>(
  items: readonly T[]
) {
  return items.filter((item) => item.status === "pending").length;
}
