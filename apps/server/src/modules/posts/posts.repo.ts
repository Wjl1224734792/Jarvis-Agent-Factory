import {
  createId,
  db,
  postCommentsTable,
  postImagesTable,
  postInteractionsTable,
  postReportsTable,
  postsTable,
  userFollowsTable,
  usersTable
} from "@feijia/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

type FeedTab = "recommended" | "latest" | "following";
type PostStatus = "pending" | "published" | "rejected" | "hidden";
type PostCommentStatus = "visible" | "hidden";
type PostInteractionType = "like" | "favorite" | "share";

function buildFeedOrder(tab: FeedTab) {
  if (tab === "recommended") {
    return [
      desc(postsTable.likeCount),
      desc(postsTable.commentCount),
      desc(sql`coalesce(${postsTable.publishedAt}, ${postsTable.createdAt})`)
    ] as const;
  }

  return [desc(sql`coalesce(${postsTable.publishedAt}, ${postsTable.createdAt})`)] as const;
}

function postSelection() {
  return {
    id: postsTable.id,
    title: postsTable.title,
    content: postsTable.content,
    status: postsTable.status,
    commentCount: postsTable.commentCount,
    reportCount: postsTable.reportCount,
    likeCount: postsTable.likeCount,
    favoriteCount: postsTable.favoriteCount,
    shareCount: postsTable.shareCount,
    createdAt: postsTable.createdAt,
    updatedAt: postsTable.updatedAt,
    publishedAt: postsTable.publishedAt,
    author: {
      id: usersTable.id,
      displayName: usersTable.displayName,
      role: usersTable.role
    }
  };
}

function imageSelection() {
  return {
    id: postImagesTable.id,
    postId: postImagesTable.postId,
    ownerId: postImagesTable.ownerId,
    fileName: postImagesTable.fileName,
    mimeType: postImagesTable.mimeType,
    byteSize: postImagesTable.byteSize,
    url: postImagesTable.dataUrl
  };
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
  async syncPostInteractionCounts(postId: string) {
    const rows = await db
      .select({
        type: postInteractionsTable.type,
        count: sql<number>`count(*)`
      })
      .from(postInteractionsTable)
      .where(eq(postInteractionsTable.postId, postId))
      .groupBy(postInteractionsTable.type);

    const counts = {
      like: 0,
      favorite: 0,
      share: 0
    };

    for (const row of rows) {
      if (row.type === "like" || row.type === "favorite" || row.type === "share") {
        counts[row.type] = Number(row.count ?? 0);
      }
    }

    await db
      .update(postsTable)
      .set({
        likeCount: counts.like,
        favoriteCount: counts.favorite,
        shareCount: counts.share,
        updatedAt: new Date()
      })
      .where(eq(postsTable.id, postId));
  },
  async createImageUpload(input: {
    ownerId: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    dataUrl: string;
  }) {
    const id = createId("image");

    await db.insert(postImagesTable).values({
      id,
      ownerId: input.ownerId,
      postId: null,
      fileName: input.fileName,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      dataUrl: input.dataUrl
    });

    return this.getImageUploadById(id);
  },
  async getImageUploadById(id: string) {
    const rows = await db
      .select(imageSelection())
      .from(postImagesTable)
      .where(eq(postImagesTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async listOwnedUnattachedImages(ownerId: string, imageIds: string[]) {
    if (imageIds.length === 0) {
      return [];
    }

    return db
      .select(imageSelection())
      .from(postImagesTable)
      .where(
        and(
          eq(postImagesTable.ownerId, ownerId),
          inArray(postImagesTable.id, imageIds),
          sql`${postImagesTable.postId} is null`
        )
      );
  },
  async attachImagesToPost(postId: string, ownerId: string, imageIds: string[]) {
    if (imageIds.length === 0) {
      return;
    }

    await db
      .update(postImagesTable)
      .set({
        postId
      })
      .where(
        and(
          eq(postImagesTable.ownerId, ownerId),
          inArray(postImagesTable.id, imageIds),
          sql`${postImagesTable.postId} is null`
        )
      );
  },
  async listPostImages(postIds: string[]) {
    if (postIds.length === 0) {
      return [];
    }

    return db
      .select(imageSelection())
      .from(postImagesTable)
      .where(and(inArray(postImagesTable.postId, postIds), sql`${postImagesTable.postId} is not null`))
      .orderBy(postImagesTable.createdAt);
  },
  async listViewerInteractions(postIds: string[], userId: string) {
    if (postIds.length === 0) {
      return [];
    }

    return db
      .select({
        postId: postInteractionsTable.postId,
        type: postInteractionsTable.type
      })
      .from(postInteractionsTable)
      .where(
        and(eq(postInteractionsTable.userId, userId), inArray(postInteractionsTable.postId, postIds))
      );
  },
  async createPost(input: {
    authorId: string;
    title: string;
    content: string;
    imageIds: string[];
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
      likeCount: 0,
      favoriteCount: 0,
      shareCount: 0,
      publishedAt: null
    });

    await this.attachImagesToPost(id, input.authorId, input.imageIds);

    return this.getPostById(id);
  },
  async getPostById(id: string) {
    const rows = await db
      .select(postSelection())
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(eq(postsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async listFeed(tab: FeedTab, currentUserId?: string | null) {
    const baseQuery = db
      .select(postSelection())
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(eq(postsTable.status, "published"));

    if (tab === "following") {
      if (!currentUserId) {
        return [];
      }

      return baseQuery
        .innerJoin(
          userFollowsTable,
          and(
            eq(userFollowsTable.followeeId, postsTable.authorId),
            eq(userFollowsTable.followerId, currentUserId)
          )
        )
        .orderBy(...buildFeedOrder(tab));
    }

    return baseQuery.orderBy(...buildFeedOrder(tab));
  },
  async listAdminPosts(status?: PostStatus) {
    const query = db
      .select(postSelection())
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .orderBy(desc(postsTable.updatedAt));

    if (status) {
      return query.where(eq(postsTable.status, status));
    }

    return query;
  },
  async updatePostStatus(id: string, status: PostStatus) {
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
    return db
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
  },
  async listCommentTreeEntries(postId: string) {
    return db
      .select({
        id: postCommentsTable.id,
        parentCommentId: postCommentsTable.parentCommentId
      })
      .from(postCommentsTable)
      .where(eq(postCommentsTable.postId, postId));
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
    const existing = await this.getCommentById(commentId);

    if (!existing || existing.postId !== postId) {
      return 0;
    }

    await db
      .delete(postCommentsTable)
      .where(and(eq(postCommentsTable.id, commentId), eq(postCommentsTable.postId, postId)));

    await this.syncPostCommentCount(postId);

    return 1;
  },
  async deletePost(id: string) {
    await db.delete(postsTable).where(eq(postsTable.id, id));
  },
  async toggleInteraction(input: {
    postId: string;
    userId: string;
    type: PostInteractionType;
  }) {
    const existing = await db
      .select({
        id: postInteractionsTable.id
      })
      .from(postInteractionsTable)
      .where(
        and(
          eq(postInteractionsTable.postId, input.postId),
          eq(postInteractionsTable.userId, input.userId),
          eq(postInteractionsTable.type, input.type)
        )
      )
      .limit(1);

    let active = false;

    if (existing.length > 0) {
      await db
        .delete(postInteractionsTable)
        .where(eq(postInteractionsTable.id, existing[0].id));
    } else {
      await db.insert(postInteractionsTable).values({
        id: createId("react"),
        postId: input.postId,
        userId: input.userId,
        type: input.type
      });
      active = true;
    }

    await this.syncPostInteractionCounts(input.postId);

    return { active };
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
  async listAdminComments(status?: PostCommentStatus) {
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
  async updateCommentStatus(id: string, status: PostCommentStatus) {
    const existing = await this.getCommentById(id);

    if (!existing) {
      return null;
    }

    const treeEntries = await this.listCommentTreeEntries(existing.postId);
    const childrenByParent = new Map<string | null, string[]>();

    for (const entry of treeEntries) {
      const siblings = childrenByParent.get(entry.parentCommentId) ?? [];
      siblings.push(entry.id);
      childrenByParent.set(entry.parentCommentId, siblings);
    }

    const stack = [id];
    const descendantIds: string[] = [];

    while (stack.length > 0) {
      const currentId = stack.pop();

      if (!currentId) {
        continue;
      }

      descendantIds.push(currentId);

      for (const childId of childrenByParent.get(currentId) ?? []) {
        stack.push(childId);
      }
    }

    await db
      .update(postCommentsTable)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(inArray(postCommentsTable.id, descendantIds));

    await this.syncPostCommentCount(existing.postId);

    return this.getCommentById(id);
  }
};
