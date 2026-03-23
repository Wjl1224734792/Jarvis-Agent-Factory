import {
  createId,
  db,
  notificationsTable,
  postCommentsTable,
  postsTable,
  userFollowsTable,
  usersTable
} from "@feijia/db";
import { and, desc, eq, inArray } from "drizzle-orm";

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
