import {
  createId,
  db,
  postCommentsTable,
  postReportsTable,
  postsTable,
  usersTable
} from "@feijia/db";
import { and, desc, eq, sql } from "drizzle-orm";

function buildFeedOrder(tab: "recommended" | "latest") {
  if (tab === "recommended") {
    return [
      desc(postsTable.commentCount),
      desc(sql`coalesce(${postsTable.publishedAt}, ${postsTable.createdAt})`)
    ] as const;
  }

  return [desc(sql`coalesce(${postsTable.publishedAt}, ${postsTable.createdAt})`)] as const;
}

export const postsRepo = {
  async syncPostCommentCount(postId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(postCommentsTable)
      .where(
        and(eq(postCommentsTable.postId, postId), eq(postCommentsTable.status, "visible"))
      );

    await db
      .update(postsTable)
      .set({
        commentCount: Number(rows[0]?.count ?? 0),
        updatedAt: new Date()
      })
      .where(eq(postsTable.id, postId));
  },
  async createPost(input: {
    authorId: string;
    title: string;
    content: string;
  }) {
    const id = createId("post");

    await db.insert(postsTable).values({
      id,
      authorId: input.authorId,
      title: input.title,
      content: input.content,
      status: "pending",
      commentCount: 0,
      reportCount: 0,
      publishedAt: null
    });

    return this.getPostById(id);
  },
  async getPostById(id: string) {
    const rows = await db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        content: postsTable.content,
        status: postsTable.status,
        commentCount: postsTable.commentCount,
        reportCount: postsTable.reportCount,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        publishedAt: postsTable.publishedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          role: usersTable.role
        }
      })
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(eq(postsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async listFeed(tab: "recommended" | "latest") {
    return db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        content: postsTable.content,
        status: postsTable.status,
        commentCount: postsTable.commentCount,
        reportCount: postsTable.reportCount,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        publishedAt: postsTable.publishedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          role: usersTable.role
        }
      })
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(eq(postsTable.status, "published"))
      .orderBy(...buildFeedOrder(tab));
  },
  async listAdminPosts(status?: "pending" | "published" | "rejected" | "hidden") {
    const query = db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        content: postsTable.content,
        status: postsTable.status,
        commentCount: postsTable.commentCount,
        reportCount: postsTable.reportCount,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
        publishedAt: postsTable.publishedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          role: usersTable.role
        }
      })
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .orderBy(desc(postsTable.updatedAt));

    if (status) {
      return query.where(eq(postsTable.status, status));
    }

    return query;
  },
  async updatePostStatus(id: string, status: "pending" | "published" | "rejected" | "hidden") {
    const existing = await this.getPostById(id);

    if (!existing) {
      return null;
    }

    await db
      .update(postsTable)
      .set({
        status,
        publishedAt:
          status === "published"
            ? existing.publishedAt ?? new Date()
            : existing.publishedAt,
        updatedAt: new Date()
      })
      .where(eq(postsTable.id, id));

    return this.getPostById(id);
  },
  async listVisibleComments(postId: string) {
    const comments = await db
      .select({
        id: postCommentsTable.id,
        postId: postCommentsTable.postId,
        parentCommentId: postCommentsTable.parentCommentId,
        content: postCommentsTable.content,
        status: postCommentsTable.status,
        createdAt: postCommentsTable.createdAt,
        updatedAt: postCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          role: usersTable.role
        }
      })
      .from(postCommentsTable)
      .innerJoin(usersTable, eq(postCommentsTable.authorId, usersTable.id))
      .where(
        and(eq(postCommentsTable.postId, postId), eq(postCommentsTable.status, "visible"))
      )
      .orderBy(postCommentsTable.createdAt);

    const topLevel = comments.filter((item) => item.parentCommentId === null);
    const replies = comments.filter((item) => item.parentCommentId !== null);

    return topLevel.map((item) => ({
      ...item,
      replies: replies.filter((reply) => reply.parentCommentId === item.id)
    }));
  },
  async getCommentById(id: string) {
    const rows = await db
      .select({
        id: postCommentsTable.id,
        postId: postCommentsTable.postId,
        authorId: postCommentsTable.authorId,
        parentCommentId: postCommentsTable.parentCommentId,
        content: postCommentsTable.content,
        status: postCommentsTable.status,
        createdAt: postCommentsTable.createdAt,
        updatedAt: postCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          role: usersTable.role
        }
      })
      .from(postCommentsTable)
      .innerJoin(usersTable, eq(postCommentsTable.authorId, usersTable.id))
      .where(eq(postCommentsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async createComment(input: {
    postId: string;
    authorId: string;
    content: string;
    parentCommentId?: string;
  }) {
    const id = createId("comment");

    await db.insert(postCommentsTable).values({
      id,
      postId: input.postId,
      authorId: input.authorId,
      parentCommentId: input.parentCommentId ?? null,
      content: input.content,
      status: "visible"
    });

    await this.syncPostCommentCount(input.postId);

    return this.getCommentById(id);
  },
  async deleteCommentThread(commentId: string, postId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(postCommentsTable)
      .where(
        and(
          eq(postCommentsTable.postId, postId),
          sql`${postCommentsTable.id} = ${commentId} or ${postCommentsTable.parentCommentId} = ${commentId}`
        )
      );

    const deletedCount = Number(rows[0]?.count ?? 0);

    await db
      .delete(postCommentsTable)
      .where(
        and(
          eq(postCommentsTable.postId, postId),
          sql`${postCommentsTable.id} = ${commentId} or ${postCommentsTable.parentCommentId} = ${commentId}`
        )
      );

    if (deletedCount > 0) {
      await this.syncPostCommentCount(postId);
    }

    return deletedCount;
  },
  async deletePost(id: string) {
    await db.delete(postsTable).where(eq(postsTable.id, id));
  },
  async createReport(input: { postId: string; reporterId: string; reason: string }) {
    const id = createId("report");

    await db
      .insert(postReportsTable)
      .values({
        id,
        postId: input.postId,
        reporterId: input.reporterId,
        reason: input.reason
      })
      .onConflictDoNothing();

    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(postReportsTable)
      .where(
        and(
          eq(postReportsTable.postId, input.postId),
          eq(postReportsTable.reporterId, input.reporterId)
        )
      );

    const exists = Number(rows[0]?.count ?? 0) > 0;

    if (exists) {
      const totals = await db
        .select({
          count: sql<number>`count(*)`
        })
        .from(postReportsTable)
        .where(eq(postReportsTable.postId, input.postId));

      await db
        .update(postsTable)
        .set({
          reportCount: Number(totals[0]?.count ?? 0),
          updatedAt: new Date()
        })
        .where(eq(postsTable.id, input.postId));
    }

    return exists;
  },
  async listAdminComments(status?: "visible" | "hidden") {
    const query = db
      .select({
        id: postCommentsTable.id,
        postId: postCommentsTable.postId,
        postTitle: postsTable.title,
        parentCommentId: postCommentsTable.parentCommentId,
        content: postCommentsTable.content,
        status: postCommentsTable.status,
        createdAt: postCommentsTable.createdAt,
        updatedAt: postCommentsTable.updatedAt,
        author: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          role: usersTable.role
        }
      })
      .from(postCommentsTable)
      .innerJoin(postsTable, eq(postCommentsTable.postId, postsTable.id))
      .innerJoin(usersTable, eq(postCommentsTable.authorId, usersTable.id))
      .orderBy(desc(postCommentsTable.updatedAt));

    if (status) {
      return query.where(eq(postCommentsTable.status, status));
    }

    return query;
  },
  async updateCommentStatus(id: string, status: "visible" | "hidden") {
    const existing = await this.getCommentById(id);

    if (!existing) {
      return null;
    }

    await db
      .update(postCommentsTable)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(postCommentsTable.id, id));

    await this.syncPostCommentCount(existing.postId);

    return this.getCommentById(id);
  }
};
