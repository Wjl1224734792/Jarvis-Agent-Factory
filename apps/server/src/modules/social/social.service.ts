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
  },
  async getUserProfile(targetUserId: string, currentUserId?: string | null) {
    const user = await socialRepo.getUserById(targetUserId);
    if (!user || user.role !== "user") {
      return null;
    }

    const [
      followerCount,
      followingCount,
      favoriteCount,
      postCount,
      rankingCount,
      aircraftCount,
      reviewCount,
      isFollowing
    ] = await Promise.all([
      socialRepo.countFollowers(targetUserId),
      socialRepo.countFollowing(targetUserId),
      socialRepo.countFavoritePosts(targetUserId),
      socialRepo.countPublishedPosts(targetUserId),
      socialRepo.countUserRankings(targetUserId),
      socialRepo.countUserAircraftSubmissions(targetUserId),
      socialRepo.countVisibleReviews(targetUserId),
      currentUserId ? socialRepo.isFollowing(currentUserId, targetUserId) : Promise.resolve(false)
    ]);

    return {
      item: {
        user: {
          id: user.id,
          displayName: user.displayName,
          role: user.role as "user" | "admin"
        },
        followerCount,
        followingCount,
        favoriteCount,
        postCount,
        rankingCount,
        aircraftCount,
        reviewCount,
        viewer: {
          isSelf: currentUserId === targetUserId,
          isFollowing
        }
      }
    };
  },
  async listUserContent(targetUserId: string, currentUserId?: string | null) {
    const user = await socialRepo.getUserById(targetUserId);
    if (!user || user.role !== "user") {
      return null;
    }

    const [posts, favoritePosts, rankings, aircraft, reviews] = await Promise.all([
      socialRepo.listUserPublishedPosts(targetUserId),
      socialRepo.listUserFavoritedPosts(targetUserId),
      socialRepo.listUserRankings(targetUserId),
      socialRepo.listUserAircraftSubmissions(targetUserId, currentUserId === targetUserId),
      socialRepo.listUserVisibleReviews(targetUserId)
    ]);

    const items = [
      ...posts.map((post) => ({
        type: "post" as const,
        id: post.id,
        postType: post.type as "article" | "moment",
        title: post.title,
        contentPreview: toPreview(post.content),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString()
      })),
      ...favoritePosts.map((post) => ({
        type: "favorite-post" as const,
        id: post.id,
        postType: post.type as "article" | "moment",
        title: post.title,
        contentPreview: toPreview(post.content),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString()
      })),
      ...rankings.map((ranking) => ({
        type: "ranking" as const,
        id: ranking.id,
        title: ranking.title,
        description: ranking.description,
        createdAt: ranking.createdAt.toISOString(),
        updatedAt: ranking.updatedAt.toISOString()
      })),
      ...aircraft.map((submission) => ({
        type: "aircraft" as const,
        id: submission.id,
        modelName: submission.modelName,
        summary: submission.summary,
        status: submission.status as "draft" | "submitted" | "approved" | "rejected",
        createdAt: submission.createdAt.toISOString(),
        updatedAt: submission.updatedAt.toISOString()
      })),
      ...reviews.map((review) => ({
        type: "review" as const,
        id: review.id,
        rating: review.rating,
        content: review.content,
        model: review.model,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString()
      }))
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return { items };
  }
};
