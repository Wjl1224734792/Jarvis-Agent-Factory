import { postsRepo } from "./posts.repo";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toPreview(content: string) {
  return content.length > 140 ? `${content.slice(0, 140)}...` : content;
}

function serializePostFeedItem(item: Awaited<ReturnType<typeof postsRepo.getPostById>>) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    contentPreview: toPreview(item.content),
    status: item.status as "pending" | "published" | "rejected" | "hidden",
    commentCount: item.commentCount,
    reportCount: item.reportCount,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    publishedAt: toIsoString(item.publishedAt),
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      role: item.author.role as "user" | "admin"
    }
  };
}

function serializeCommentThread(items: Awaited<ReturnType<typeof postsRepo.listVisibleComments>>) {
  return items.map((item) => ({
    id: item.id,
    postId: item.postId,
    parentCommentId: item.parentCommentId,
    content: item.content,
    status: item.status as "visible" | "hidden",
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      role: item.author.role as "user" | "admin"
    },
    replies: item.replies.map((reply) => ({
      id: reply.id,
      postId: reply.postId,
      parentCommentId: reply.parentCommentId!,
      content: reply.content,
      status: reply.status as "visible" | "hidden",
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString(),
      author: {
        id: reply.author.id,
        displayName: reply.author.displayName,
        role: reply.author.role as "user" | "admin"
      }
    }))
  }));
}

export const postsService = {
  async listFeed(tab: "recommended" | "latest") {
    const items = await postsRepo.listFeed(tab);

    return {
      tab,
      items: items
        .map((item) =>
          serializePostFeedItem({
            ...item
          })
        )
        .filter((item): item is NonNullable<typeof item> => item !== null)
    };
  },
  async createPost(input: {
    authorId: string;
    title: string;
    content: string;
  }) {
    const item = await postsRepo.createPost(input);

    if (!item) {
      return null;
    }

    return {
      item: {
        id: item.id,
        title: item.title,
        content: item.content,
        status: item.status as "pending" | "published" | "rejected" | "hidden",
        commentCount: item.commentCount,
        reportCount: item.reportCount,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        publishedAt: toIsoString(item.publishedAt),
        author: {
          id: item.author.id,
          displayName: item.author.displayName,
          role: item.author.role as "user" | "admin"
        },
        comments: []
      }
    };
  },
  async getPostDetail(id: string, currentUser?: { id: string; role: "user" | "admin" } | null) {
    const item = await postsRepo.getPostById(id);

    if (!item) {
      return null;
    }

    const canInspectUnpublished =
      currentUser?.role === "admin" || currentUser?.id === item.author.id;

    if (item.status !== "published" && !canInspectUnpublished) {
      return null;
    }

    const comments = await postsRepo.listVisibleComments(id);

    return {
      item: {
        id: item.id,
        title: item.title,
        content: item.content,
        status: item.status as "pending" | "published" | "rejected" | "hidden",
        commentCount: item.commentCount,
        reportCount: item.reportCount,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        publishedAt: toIsoString(item.publishedAt),
        author: {
          id: item.author.id,
          displayName: item.author.displayName,
          role: item.author.role as "user" | "admin"
        },
        comments: serializeCommentThread(comments)
      }
    };
  },
  async listAdminPosts(status?: "pending" | "published" | "rejected" | "hidden") {
    const items = await postsRepo.listAdminPosts(status);

    return {
      items: items
        .map((item) =>
          serializePostFeedItem({
            ...item
          })
        )
        .filter((item): item is NonNullable<typeof item> => item !== null)
    };
  },
  async updatePostStatus(id: string, status: "pending" | "published" | "rejected" | "hidden") {
    const item = await postsRepo.updatePostStatus(id, status);
    return item ? serializePostFeedItem(item) : null;
  },
  async createComment(
    postId: string,
    currentUser: { id: string; role: "user" | "admin" },
    input: {
      content: string;
      parentCommentId?: string;
    }
  ) {
    const post = await postsRepo.getPostById(postId);

    if (!post || post.status !== "published") {
      return { kind: "not_found" as const };
    }

    if (input.parentCommentId) {
      const parent = await postsRepo.getCommentById(input.parentCommentId);

      if (!parent || parent.postId !== postId || parent.status !== "visible") {
        return { kind: "not_found" as const };
      }

      if (parent.parentCommentId !== null) {
        return { kind: "invalid_parent" as const };
      }
    }

    const item = await postsRepo.createComment({
      postId,
      authorId: currentUser.id,
      content: input.content,
      parentCommentId: input.parentCommentId
    });

    if (!item) {
      return { kind: "not_found" as const };
    }

    if (item.parentCommentId) {
      return {
        kind: "ok" as const,
        item: {
          id: item.id,
          postId: item.postId,
          parentCommentId: item.parentCommentId,
          content: item.content,
          status: item.status as "visible" | "hidden",
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          author: {
            id: item.author.id,
            displayName: item.author.displayName,
            role: item.author.role as "user" | "admin"
          }
        }
      };
    }

    return {
      kind: "ok" as const,
      item: {
        id: item.id,
        postId: item.postId,
        parentCommentId: null,
        content: item.content,
        status: item.status as "visible" | "hidden",
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        author: {
          id: item.author.id,
          displayName: item.author.displayName,
          role: item.author.role as "user" | "admin"
        },
        replies: []
      }
    };
  },
  async deleteComment(
    postId: string,
    commentId: string,
    currentUser: { id: string; role: "user" | "admin" }
  ) {
    const comment = await postsRepo.getCommentById(commentId);

    if (!comment || comment.postId !== postId) {
      return { kind: "not_found" as const };
    }

    const canDelete =
      currentUser.role === "admin" || currentUser.id === comment.author.id;

    if (!canDelete) {
      return { kind: "forbidden" as const };
    }

    await postsRepo.deleteCommentThread(commentId, postId);

    return { kind: "ok" as const };
  },
  async deletePost(id: string, currentUser: { id: string; role: "user" | "admin" }) {
    const post = await postsRepo.getPostById(id);

    if (!post) {
      return { kind: "not_found" as const };
    }

    const canDelete = currentUser.role === "admin" || currentUser.id === post.author.id;

    if (!canDelete) {
      return { kind: "forbidden" as const };
    }

    await postsRepo.deletePost(id);

    return { kind: "ok" as const };
  },
  async reportPost(postId: string, reporterId: string, reason: string) {
    const post = await postsRepo.getPostById(postId);

    if (!post || post.status !== "published") {
      return { kind: "not_found" as const };
    }

    await postsRepo.createReport({
      postId,
      reporterId,
      reason
    });

    return { kind: "ok" as const };
  },
  async listAdminComments(status?: "visible" | "hidden") {
    const items = await postsRepo.listAdminComments(status);

    return {
      items: items.map((item) => ({
        id: item.id,
        postId: item.postId,
        postTitle: item.postTitle,
        parentCommentId: item.parentCommentId,
        content: item.content,
        status: item.status as "visible" | "hidden",
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        author: {
          id: item.author.id,
          displayName: item.author.displayName,
          role: item.author.role as "user" | "admin"
        }
      }))
    };
  },
  async updateCommentStatus(id: string, status: "visible" | "hidden") {
    const item = await postsRepo.updateCommentStatus(id, status);

    if (!item) {
      return null;
    }

    const post = await postsRepo.getPostById(item.postId);

    return {
      id: item.id,
      postId: item.postId,
      postTitle: post?.title ?? "",
      parentCommentId: item.parentCommentId,
      content: item.content,
      status: item.status as "visible" | "hidden",
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      author: {
        id: item.author.id,
        displayName: item.author.displayName,
        role: item.author.role as "user" | "admin"
      }
    };
  }
};
