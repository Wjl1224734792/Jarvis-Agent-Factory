export function buildCommentThreads<T extends { id: string; parentCommentId: string | null }>(
  comments: T[],
  _options?: { compare?: (a: T, b: T) => number }
): T[] {
  return comments;
}

type ReplyToUserSummary = {
  id: string;
  displayName: string;
  ipLocationLabel?: string | null;
  role: "user" | "admin";
};

export function buildReplyToUserMap(users: ReplyToUserSummary[]) {
  const map = new Map<string, ReplyToUserSummary>();
  for (const user of users) {
    map.set(user.id, user);
  }
  return map;
}
