export const commentDomains = [
  "post",
  "review",
  "model",
  "ranking",
  "rating-target"
] as const;

export type CommentDomain = (typeof commentDomains)[number];
export type AdminCommentStatus = "all" | "pending" | "visible" | "hidden";

export type AdminCommentListItemLike = {
  id: string;
};

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

export function isAdminCommentTargetMatch(itemId: string, targetId: string | null) {
  return targetId !== null && itemId === targetId;
}

export function sortAdminCommentsWithTargetFirst<T extends AdminCommentListItemLike>(
  items: readonly T[],
  targetId: string | null
) {
  if (!targetId) {
    return items;
  }

  return [...items].sort((left, right) => {
    if (isAdminCommentTargetMatch(left.id, targetId)) {
      return -1;
    }
    if (isAdminCommentTargetMatch(right.id, targetId)) {
      return 1;
    }
    return 0;
  });
}

export function buildCommentAuditManualDecision(
  entityId: string,
  nextStatus: "visible" | "hidden"
) {
  return {
    domain: "comment" as const,
    entityId,
    status: nextStatus === "visible" ? ("manual_passed" as const) : ("manual_rejected" as const),
    reviewNote: nextStatus === "hidden" ? "管理员已在评论审核页隐藏该评论。" : null
  };
}
