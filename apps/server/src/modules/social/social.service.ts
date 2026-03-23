import { socialRepo } from "./social.repo";

function toPreview(content: string) {
  return content.length > 80 ? `${content.slice(0, 80)}...` : content;
}

export const socialService = {
  async toggleFollow(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      return { kind: "invalid_self" as const };
    }

    const targetUser = await socialRepo.getUserById(targetUserId);

    if (!targetUser || targetUser.role !== "user") {
      return { kind: "not_found" as const };
    }

    const result = await socialRepo.toggleFollow(currentUserId, targetUserId);

    if (result.following) {
      await this.recordNotification({
        userId: targetUserId,
        actorId: currentUserId,
        type: "followed"
      });
    }

    return { kind: "ok" as const, following: result.following };
  },
  async recordNotification(input: {
    userId: string;
    actorId: string;
    type:
      | "followed"
      | "post_liked"
      | "post_favorited"
      | "post_shared"
      | "post_commented"
      | "comment_replied";
    postId?: string | null;
    commentId?: string | null;
  }) {
    if (input.userId === input.actorId) {
      return;
    }

    await socialRepo.createNotification(input);
  },
  async listFollowingStateSet(currentUserId: string, authorIds: string[]) {
    const rows = await socialRepo.listFollowingStates(
      currentUserId,
      Array.from(new Set(authorIds))
    );

    return new Set(rows.map((row) => row.followeeId));
  },
  async listNotifications(userId: string) {
    const rows = await socialRepo.listNotifications(userId);
    const actorIds = Array.from(new Set(rows.map((item) => item.actorId)));
    const postIds = Array.from(
      new Set(rows.map((item) => item.postId).filter((item): item is string => Boolean(item)))
    );
    const commentIds = Array.from(
      new Set(rows.map((item) => item.commentId).filter((item): item is string => Boolean(item)))
    );

    const [actors, posts, comments] = await Promise.all([
      socialRepo.listUsersByIds(actorIds),
      socialRepo.listPostsByIds(postIds),
      socialRepo.listCommentsByIds(commentIds)
    ]);

    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
    const postById = new Map(posts.map((post) => [post.id, post]));
    const commentById = new Map(comments.map((comment) => [comment.id, comment]));

    return {
      unreadCount: rows.filter((item) => !item.isRead).length,
      items: rows
        .map((item) => {
          const actor = actorById.get(item.actorId);

          if (!actor) {
            return null;
          }

          const post = item.postId ? postById.get(item.postId) ?? null : null;
          const comment = item.commentId ? commentById.get(item.commentId) ?? null : null;

          return {
            id: item.id,
            type: item.type as
              | "followed"
              | "post_liked"
              | "post_favorited"
              | "post_shared"
              | "post_commented"
              | "comment_replied",
            isRead: item.isRead,
            createdAt: item.createdAt.toISOString(),
            actor: {
              id: actor.id,
              displayName: actor.displayName,
              role: actor.role as "user" | "admin"
            },
            post: post
              ? {
                  id: post.id,
                  title: post.title
                }
              : null,
            comment: comment
              ? {
                  id: comment.id,
                  postId: comment.postId,
                  contentPreview: toPreview(comment.content)
                }
              : null
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    };
  },
  async markAllNotificationsRead(userId: string) {
    await socialRepo.markAllNotificationsRead(userId);
    return { success: true as const };
  }
};
