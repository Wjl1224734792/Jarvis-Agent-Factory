import type { InfiniteData, QueryClient } from "@tanstack/react-query";
type PostViewerState = {
  isFollowingAuthor: boolean;
  hasLiked: boolean;
  hasFavorited: boolean;
  hasShared: boolean;
};

type PostFeedItem = {
  id: string;
  author: { id: string };
  engagement: {
    likeCount: number;
    favoriteCount: number;
    shareCount: number;
    viewer: PostViewerState;
  };
  commentCount: number;
  viewCount: number;
};

type CircleFeedData = {
  items: PostFeedItem[];
};

type CursorFeedPage<T> = {
  items: T[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

type PostCommentViewerState = {
  canEdit?: boolean;
  canDelete?: boolean;
  hasLiked: boolean;
  hasReported: boolean;
};

type PostCommentReply = {
  id: string;
  parentCommentId: string | null;
  replyToCommentId: string | null;
  status: "pending" | "visible" | "hidden";
  likeCount: number;
  reportCount: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string };
  replyToUser: { displayName: string } | null;
  viewer: PostCommentViewerState;
};

type PostCommentThread = PostCommentReply & {
  replyCount: number;
  replies: PostCommentReply[];
};

type PostDetailItem = PostFeedItem & {
  comments: PostCommentThread[];
};

type PostDetailData = {
  item: PostDetailItem;
};

type PostCommentNode = PostCommentThread | PostCommentReply;

function clampCount(value: number) {
  return Math.max(0, value);
}

function isFeedPageData<T>(value: unknown): value is CursorFeedPage<T> | { items: T[] } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "items" in value &&
      Array.isArray((value as { items?: unknown }).items)
  );
}

function isInfiniteFeedData<T>(value: unknown): value is InfiniteData<CursorFeedPage<T>> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "pages" in value &&
      Array.isArray((value as { pages?: unknown }).pages)
  );
}

function patchFeedCollection<T>(
  current: unknown,
  updater: (item: T) => T
) {
  if (isInfiniteFeedData<T>(current)) {
    return {
      ...current,
      pages: current.pages.map((page) =>
        isFeedPageData<T>(page)
          ? {
              ...page,
              items: page.items.map(updater)
            }
          : page
      )
    };
  }

  if (isFeedPageData<T>(current)) {
    return {
      ...current,
      items: current.items.map(updater)
    };
  }

  return current;
}

function updateHomeShellFeeds(
  queryClient: QueryClient,
  updater: (item: PostFeedItem) => PostFeedItem
) {
  queryClient.setQueriesData({ queryKey: ["home-shell-feed"] }, (current) =>
    patchFeedCollection<PostFeedItem>(current, updater)
  );
}

function updateCircleFeeds(
  queryClient: QueryClient,
  updater: (item: CircleFeedData["items"][number]) => CircleFeedData["items"][number]
) {
  queryClient.setQueriesData({ queryKey: ["circle-feed"] }, (current) =>
    patchFeedCollection<CircleFeedData["items"][number]>(current, updater)
  );
}

export function updatePostFeedItemById(
  queryClient: QueryClient,
  postId: string,
  updater: (item: PostFeedItem) => PostFeedItem
) {
  updateHomeShellFeeds(queryClient, (item) => (item.id === postId ? updater(item) : item));
  updateCircleFeeds(queryClient, (item) => (item.id === postId ? updater(item) : item));
}

export function updatePostDetailById(
  queryClient: QueryClient,
  postId: string,
  updater: (item: PostDetailItem) => PostDetailItem
) {
  queryClient.setQueriesData<PostDetailData>({ queryKey: ["post-detail", postId] }, (current) => {
    if (!current?.item) {
      return current;
    }

    return {
      ...current,
      item: updater(current.item)
    };
  });
}

export function patchPostInteractionState(
  queryClient: QueryClient,
  input: {
    postId: string;
    likeDelta?: number;
    favoriteDelta?: number;
    shareDelta?: number;
    viewerPatch?: Partial<PostDetailItem["engagement"]["viewer"]>;
  }
) {
  const likeDelta = input.likeDelta ?? 0;
  const favoriteDelta = input.favoriteDelta ?? 0;
  const shareDelta = input.shareDelta ?? 0;

  const patchFeedItem = (item: PostFeedItem) => ({
    ...item,
    engagement: {
      ...item.engagement,
      likeCount: clampCount(item.engagement.likeCount + likeDelta),
      favoriteCount: clampCount(item.engagement.favoriteCount + favoriteDelta),
      shareCount: clampCount(item.engagement.shareCount + shareDelta),
      viewer: {
        ...item.engagement.viewer,
        ...input.viewerPatch
      }
    }
  });

  updatePostFeedItemById(queryClient, input.postId, patchFeedItem);
  updatePostDetailById(queryClient, input.postId, (item) => ({
    ...item,
    engagement: {
      ...item.engagement,
      likeCount: clampCount(item.engagement.likeCount + likeDelta),
      favoriteCount: clampCount(item.engagement.favoriteCount + favoriteDelta),
      shareCount: clampCount(item.engagement.shareCount + shareDelta),
      viewer: {
        ...item.engagement.viewer,
        ...input.viewerPatch
      }
    }
  }));
}

export function patchPostAuthorFollowState(
  queryClient: QueryClient,
  authorId: string,
  isFollowingAuthor: boolean
) {
  updateHomeShellFeeds(queryClient, (item) =>
    item.author.id !== authorId
      ? item
      : {
          ...item,
          engagement: {
            ...item.engagement,
            viewer: {
              ...item.engagement.viewer,
              isFollowingAuthor
            }
          }
        }
  );
  updateCircleFeeds(queryClient, (item) =>
    item.author.id !== authorId
      ? item
      : {
          ...item,
          engagement: {
            ...item.engagement,
            viewer: {
              ...item.engagement.viewer,
              isFollowingAuthor
            }
          }
        }
  );
  queryClient.setQueriesData<PostDetailData>({ queryKey: ["post-detail"] }, (current) => {
    if (!current?.item || current.item.author.id !== authorId) {
      return current;
    }

    return {
      ...current,
      item: {
        ...current.item,
        engagement: {
          ...current.item.engagement,
          viewer: {
            ...current.item.engagement.viewer,
            isFollowingAuthor
          }
        }
      }
    };
  });
}

function updateCommentTree(
  comments: PostCommentThread[],
  commentId: string,
  updater: (comment: PostCommentNode, rootId: string) => PostCommentNode
) {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return updater(comment, comment.id) as PostCommentThread;
    }

    const nextReplies = comment.replies.map((reply) =>
      reply.id === commentId ? (updater(reply, comment.id) as PostCommentReply) : reply
    );
    return nextReplies === comment.replies ? comment : { ...comment, replies: nextReplies };
  });
}

function appendCommentToThreads(
  comments: PostCommentThread[],
  comment: PostCommentReply
) {
  if (!comment.parentCommentId) {
    return [
      ...comments,
      {
        ...comment,
        replyCount: 0,
        replies: []
      }
    ];
  }

  return comments.map((thread) =>
    thread.id !== comment.parentCommentId
      ? thread
      : {
          ...thread,
          replyCount: thread.replyCount + 1,
          replies: [...thread.replies, comment]
        }
  );
}

export function patchPostCommentCreated(
  queryClient: QueryClient,
  postId: string,
  comment: PostCommentReply
) {
  const countDelta = comment.status === "visible" ? 1 : 0;
  updatePostFeedItemById(queryClient, postId, (item) => ({
    ...item,
    commentCount: clampCount(item.commentCount + countDelta)
  }));
  updatePostDetailById(queryClient, postId, (item) => ({
    ...item,
    commentCount: clampCount(item.commentCount + countDelta),
    comments: appendCommentToThreads(item.comments, comment)
  }));
}

export function patchPostCommentUpdated(
  queryClient: QueryClient,
  postId: string,
  commentId: string,
  updatedComment: PostCommentReply,
  previousStatus: "pending" | "visible" | "hidden"
) {
  const visibilityDelta =
    previousStatus === updatedComment.status
      ? 0
      : previousStatus === "visible" && updatedComment.status !== "visible"
        ? -1
        : previousStatus !== "visible" && updatedComment.status === "visible"
          ? 1
          : 0;

  updatePostFeedItemById(queryClient, postId, (item) => ({
    ...item,
    commentCount: clampCount(item.commentCount + visibilityDelta)
  }));
  updatePostDetailById(queryClient, postId, (item) => ({
    ...item,
    commentCount: clampCount(item.commentCount + visibilityDelta),
    comments: updateCommentTree(item.comments, commentId, () => updatedComment)
  }));
}

export function patchPostCommentDeleted(
  queryClient: QueryClient,
  postId: string,
  rootCommentId: string,
  removedVisibleCount: number
) {
  updatePostFeedItemById(queryClient, postId, (item) => ({
    ...item,
    commentCount: clampCount(item.commentCount - removedVisibleCount)
  }));
  updatePostDetailById(queryClient, postId, (item) => ({
    ...item,
    commentCount: clampCount(item.commentCount - removedVisibleCount),
    comments: item.comments.filter((comment) => comment.id !== rootCommentId)
  }));
}

/** 删除一条回复：从父线程 replies 移除并同步帖子 commentCount */
export function patchPostReplyDeleted(
  queryClient: QueryClient,
  postId: string,
  parentCommentId: string,
  replyId: string,
  removedVisibleCount: number
) {
  updatePostFeedItemById(queryClient, postId, (item) => ({
    ...item,
    commentCount: clampCount(item.commentCount - removedVisibleCount)
  }));
  updatePostDetailById(queryClient, postId, (item) => ({
    ...item,
    commentCount: clampCount(item.commentCount - removedVisibleCount),
    comments: item.comments.map((thread) => {
      if (thread.id !== parentCommentId) {
        return thread;
      }
      const nextReplies = thread.replies.filter((r) => r.id !== replyId);
      return {
        ...thread,
        replies: nextReplies,
        replyCount: nextReplies.length
      };
    })
  }));
}

export function patchPostCommentLikeToggle(
  queryClient: QueryClient,
  postId: string,
  commentId: string,
  nextHasLiked: boolean
) {
  updatePostDetailById(queryClient, postId, (item) => ({
    ...item,
    comments: updateCommentTree(item.comments, commentId, (comment) => ({
      ...comment,
      likeCount: clampCount(comment.likeCount + (nextHasLiked ? 1 : -1)),
      viewer: {
        ...comment.viewer,
        hasLiked: nextHasLiked
      }
    }))
  }));
}

export function patchPostCommentReported(
  queryClient: QueryClient,
  postId: string,
  commentId: string
) {
  updatePostDetailById(queryClient, postId, (item) => ({
    ...item,
    comments: updateCommentTree(item.comments, commentId, (comment) => ({
      ...comment,
      reportCount: clampCount(comment.reportCount + 1),
      viewer: {
        ...comment.viewer,
        hasReported: true
      }
    }))
  }));
}

export function patchPostViewCount(
  queryClient: QueryClient,
  postId: string,
  delta = 1
) {
  updatePostFeedItemById(queryClient, postId, (item) => ({
    ...item,
    viewCount: clampCount(item.viewCount + delta)
  }));
  updatePostDetailById(queryClient, postId, (item) => ({
    ...item,
    viewCount: clampCount(item.viewCount + delta)
  }));
}
