import { isValidAuthRole } from "./type-guards";

/**
 * 共享评论序列化工具
 *
 * 提取 posts / reviews / rankings 三个模块中重复的评论序列化逻辑：
 * - buildReplyToUserMap: 构建回复目标用户映射
 * - buildCommentThreads: 将扁平评论列表组装为树形结构（根评论 + 回复）
 *
 * 各模块的评论序列化（author 字段差异、avatarUrl 有无、额外字段如 rating）
 * 仍保留在各自模块中，通过泛型 + 回调接入共享的树构建逻辑。
 */

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** 回复目标用户的最小公共结构 */
export type ReplyToUser = {
  id: string;
  displayName: string;
  role: "user" | "admin";
};

/** 带 avatarUrl 的回复目标用户（reviews / rankings 使用） */
export type ReplyToUserWithAvatar = ReplyToUser & {
  avatarUrl: string | null;
};

/** 可被组装为树形结构的已序列化评论 */
export interface ThreadableComment {
  id: string;
  parentCommentId?: string | null;
}

/** 带回复列表的评论线程节点 */
export type CommentThread<T extends ThreadableComment> = T & {
  replyCount: number;
  replies: T[];
};

/** 排序比较函数 */
export type CommentComparator<T> = (a: T, b: T) => number;

// ---------------------------------------------------------------------------
// buildReplyToUserMap
// ---------------------------------------------------------------------------

/**
 * 构建回复目标用户映射（同步版本）。
 *
 * posts 模块使用：不包含 avatarUrl。
 */
export function buildReplyToUserMap<
  T extends { id: string; displayName: string; role: string }
>(users: T[]): Map<string, ReplyToUser> {
  return new Map(
    users.map((user) => [
      user.id,
      {
        id: user.id,
        displayName: user.displayName,
        // Database text column constrained to valid AuthRole values at insert time
        role: isValidAuthRole(user.role) ? user.role : ("user" as "user" | "admin"),
      },
    ])
  );
}

/**
 * 构建回复目标用户映射（异步版本）。
 *
 * reviews / rankings 模块使用：通过 transform 回调支持 avatarUrl 等异步解析。
 */
export async function buildReplyToUserMapAsync<
  T extends { id: string; displayName: string; role: string },
  R extends ReplyToUser
>(
  users: T[],
  transform: (user: T) => Promise<R>
): Promise<Map<string, R>> {
  const pairs = await Promise.all(
    users.map(async (user) => [user.id, await transform(user)] as const)
  );
  return new Map(pairs);
}

// ---------------------------------------------------------------------------
// buildCommentThreads
// ---------------------------------------------------------------------------

/**
 * 将已序列化的扁平评论列表组装为树形结构。
 *
 * - 无 parentCommentId 的评论作为根评论
 * - 有 parentCommentId 的评论按 parentCommentId 分组挂到对应根评论下
 * - 可选传入比较函数对根评论和回复进行排序
 *
 * 泛型 T 必须满足 ThreadableComment（至少包含 id 和可选的 parentCommentId），
 * 返回类型为 CommentThread<T>，即在 T 的基础上增加 replyCount 和 replies。
 */
export function buildCommentThreads<T extends ThreadableComment>(
  comments: T[],
  options?: {
    /** 排序比较函数，同时应用于根评论和回复列表 */
    compare?: CommentComparator<T>;
  }
): CommentThread<T>[] {
  const repliesByRootId = new Map<string, T[]>();
  const roots: CommentThread<T>[] = [];

  for (const comment of comments) {
    if (!comment.parentCommentId) {
      roots.push({
        ...comment,
        replyCount: 0,
        replies: [],
      } as CommentThread<T>);
      continue;
    }

    const bucket = repliesByRootId.get(comment.parentCommentId) ?? [];
    bucket.push(comment);
    repliesByRootId.set(comment.parentCommentId, bucket);
  }

  const result = roots.map((root) => {
    const replies = repliesByRootId.get(root.id) ?? [];
    const sortedReplies = options?.compare ? [...replies].sort(options.compare) : replies;
    return {
      ...root,
      replies: sortedReplies,
      replyCount: replies.length,
    };
  });

  return options?.compare ? [...result].sort(options.compare) : result;
}
