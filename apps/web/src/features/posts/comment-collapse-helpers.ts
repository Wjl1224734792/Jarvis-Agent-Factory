/** 评论区「默认 N 条顶级 + 展开全部」共用逻辑（便于单测） */

export function getVisibleRootComments<T>(
  sorted: readonly T[],
  limit: number | undefined,
  expanded: boolean
): T[] {
  if (limit == null || limit <= 0 || expanded) {
    return [...sorted];
  }
  return sorted.slice(0, limit);
}

export function shouldShowCommentCollapseToggle(
  sortedLength: number,
  limit: number | undefined
): boolean {
  return Boolean(limit && sortedLength > limit);
}

/** 帖子详情：顶级评论 + 一层回复的估算条数（无 totalCommentCount 时的兜底） */
export function estimateTotalCommentsFromPostRoots<T extends { replies?: readonly unknown[] }>(
  roots: readonly T[]
): number {
  return roots.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);
}
