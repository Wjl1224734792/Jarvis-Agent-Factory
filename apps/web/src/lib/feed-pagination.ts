type CursorPaginationLike = {
  nextCursor?: string | null;
  pagination?: {
    hasMore?: boolean;
  };
};

type CursorPaginationWithTopLevelFlag = CursorPaginationLike & {
  hasMore?: boolean;
};

export function resolveFeedNextCursor(page: CursorPaginationWithTopLevelFlag) {
  const hasMore =
    typeof page.hasMore === "boolean" ? page.hasMore : page.pagination?.hasMore;

  return hasMore ? (page.nextCursor ?? undefined) : undefined;
}
