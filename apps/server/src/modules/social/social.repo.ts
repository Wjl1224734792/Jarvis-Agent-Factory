import {
  aircraftSubmissionsTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  createId,
  db,
  notificationsTable,
  postCommentsTable,
  postInteractionsTable,
  postsTable,
  rankingsTable,
  userFollowsTable,
  usersTable
} from "@feijia/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

type NotificationType =
  | "followed"
  | "post_liked"
  | "post_favorited"
  | "post_shared"
  | "post_commented"
  | "comment_replied";

export const socialRepo = {
  async getUserById(id: string) {
    const rows = await db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        role: usersTable.role
      })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async toggleFollow(followerId: string, followeeId: string) {
    const existing = await db
      .select({
        id: userFollowsTable.id
      })
      .from(userFollowsTable)
      .where(
        and(
          eq(userFollowsTable.followerId, followerId),
          eq(userFollowsTable.followeeId, followeeId)
        )
      )
      .limit(1);

    let following = false;

    if (existing.length > 0) {
      await db.delete(userFollowsTable).where(eq(userFollowsTable.id, existing[0].id));
    } else {
      await db.insert(userFollowsTable).values({
        id: createId("follow"),
        followerId,
        followeeId
      });
      following = true;
    }

    return { following };
  },
  async listFollowingStates(followerId: string, followeeIds: string[]) {
    if (followeeIds.length === 0) {
      return [];
    }

    return db
      .select({
        followeeId: userFollowsTable.followeeId
      })
      .from(userFollowsTable)
      .where(
        and(
          eq(userFollowsTable.followerId, followerId),
          inArray(userFollowsTable.followeeId, followeeIds)
        )
      );
  },
  async isFollowing(followerId: string, followeeId: string) {
    const rows = await db
      .select({
        id: userFollowsTable.id
      })
      .from(userFollowsTable)
      .where(
        and(eq(userFollowsTable.followerId, followerId), eq(userFollowsTable.followeeId, followeeId))
      )
      .limit(1);

    return rows.length > 0;
  },
  async countFollowers(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(userFollowsTable)
      .where(eq(userFollowsTable.followeeId, userId));

    return Number(rows[0]?.count ?? 0);
  },
  async countFollowing(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(userFollowsTable)
      .where(eq(userFollowsTable.followerId, userId));

    return Number(rows[0]?.count ?? 0);
  },
  async countPublishedPosts(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(postsTable)
      .where(and(eq(postsTable.authorId, userId), eq(postsTable.status, "published")));

    return Number(rows[0]?.count ?? 0);
  },
  async countVisibleReviews(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(aircraftReviewsTable)
      .where(and(eq(aircraftReviewsTable.userId, userId), eq(aircraftReviewsTable.status, "visible")));

    return Number(rows[0]?.count ?? 0);
  },
  async countFavoritePosts(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(postInteractionsTable)
      .where(
        and(eq(postInteractionsTable.userId, userId), eq(postInteractionsTable.type, "favorite"))
      );

    return Number(rows[0]?.count ?? 0);
  },
  async countUserRankings(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(rankingsTable)
      .where(eq(rankingsTable.authorId, userId));

    return Number(rows[0]?.count ?? 0);
  },
  async countUserAircraftSubmissions(userId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(aircraftSubmissionsTable)
      .where(eq(aircraftSubmissionsTable.authorId, userId));

    return Number(rows[0]?.count ?? 0);
  },
  async listUserPublishedPosts(userId: string) {
    return db
      .select({
        id: postsTable.id,
        type: postsTable.type,
        title: postsTable.title,
        content: postsTable.content,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt
      })
      .from(postsTable)
      .where(and(eq(postsTable.authorId, userId), eq(postsTable.status, "published")))
      .orderBy(desc(postsTable.updatedAt));
  },
  async listUserFavoritedPosts(userId: string) {
    return db
      .select({
        id: postsTable.id,
        type: postsTable.type,
        title: postsTable.title,
        content: postsTable.content,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt
      })
      .from(postInteractionsTable)
      .innerJoin(postsTable, eq(postInteractionsTable.postId, postsTable.id))
      .where(
        and(
          eq(postInteractionsTable.userId, userId),
          eq(postInteractionsTable.type, "favorite"),
          eq(postsTable.status, "published")
        )
      )
      .orderBy(desc(postInteractionsTable.createdAt));
  },
  async listUserVisibleReviews(userId: string) {
    return db
      .select({
        id: aircraftReviewsTable.id,
        rating: aircraftReviewsTable.rating,
        content: aircraftReviewsTable.content,
        createdAt: aircraftReviewsTable.createdAt,
        updatedAt: aircraftReviewsTable.updatedAt,
        model: {
          id: aircraftModelsTable.id,
          slug: aircraftModelsTable.slug,
          name: aircraftModelsTable.name
        }
      })
      .from(aircraftReviewsTable)
      .innerJoin(aircraftModelsTable, eq(aircraftReviewsTable.modelId, aircraftModelsTable.id))
      .where(and(eq(aircraftReviewsTable.userId, userId), eq(aircraftReviewsTable.status, "visible")))
      .orderBy(desc(aircraftReviewsTable.updatedAt));
  },
  async listUserRankings(userId: string) {
    return db
      .select({
        id: rankingsTable.id,
        title: rankingsTable.title,
        description: rankingsTable.description,
        createdAt: rankingsTable.createdAt,
        updatedAt: rankingsTable.updatedAt
      })
      .from(rankingsTable)
      .where(eq(rankingsTable.authorId, userId))
      .orderBy(desc(rankingsTable.updatedAt));
  },
  async listUserAircraftSubmissions(userId: string, includePrivate: boolean) {
    return db
      .select({
        id: aircraftSubmissionsTable.id,
        modelName: aircraftSubmissionsTable.modelName,
        summary: aircraftSubmissionsTable.summary,
        status: aircraftSubmissionsTable.status,
        createdAt: aircraftSubmissionsTable.createdAt,
        updatedAt: aircraftSubmissionsTable.updatedAt
      })
      .from(aircraftSubmissionsTable)
      .where(
        and(
          eq(aircraftSubmissionsTable.authorId, userId),
          includePrivate
            ? sql`true`
            : eq(aircraftSubmissionsTable.status, "approved")
        )
      )
      .orderBy(desc(aircraftSubmissionsTable.updatedAt));
  },
  async createNotification(input: {
    userId: string;
    actorId: string;
    type: NotificationType;
    postId?: string | null;
    commentId?: string | null;
  }) {
    await db.insert(notificationsTable).values({
      id: createId("notice"),
      userId: input.userId,
      actorId: input.actorId,
      type: input.type,
      postId: input.postId ?? null,
      commentId: input.commentId ?? null,
      isRead: false
    });
  },
  async listNotifications(userId: string) {
    return db
      .select({
        id: notificationsTable.id,
        userId: notificationsTable.userId,
        actorId: notificationsTable.actorId,
        type: notificationsTable.type,
        postId: notificationsTable.postId,
        commentId: notificationsTable.commentId,
        isRead: notificationsTable.isRead,
        createdAt: notificationsTable.createdAt
      })
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt));
  },
  async markAllNotificationsRead(userId: string) {
    await db
      .update(notificationsTable)
      .set({
        isRead: true
      })
      .where(eq(notificationsTable.userId, userId));
  },
  async listUsersByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        role: usersTable.role
      })
      .from(usersTable)
      .where(inArray(usersTable.id, ids));
  },
  async listPostsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return db
      .select({
        id: postsTable.id,
        title: postsTable.title
      })
      .from(postsTable)
      .where(inArray(postsTable.id, ids));
  },
  async listCommentsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return db
      .select({
        id: postCommentsTable.id,
        postId: postCommentsTable.postId,
        content: postCommentsTable.content
      })
      .from(postCommentsTable)
      .where(inArray(postCommentsTable.id, ids));
  }
};
