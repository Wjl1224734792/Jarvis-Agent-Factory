import {
  contentCategoriesTable,
  createId,
  db,
  postCommentsTable,
  postImagesTable,
  postInteractionsTable,
  postReportsTable,
  postsTable,
  videoAssetsTable,
  userFollowsTable,
  usersTable
} from "@feijia/db";
import { and, asc, desc, eq, inArray, notInArray, or, sql } from "drizzle-orm";

type FeedTab = "recommended" | "latest" | "following";
type PostStatus = "pending" | "published" | "rejected" | "hidden";
type PostType = "article" | "moment";
type PostCommentStatus = "pending" | "visible" | "hidden";
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
    type: postsTable.type,
    title: postsTable.title,
    content: postsTable.content,
    contentHtml: postsTable.contentHtml,
    contentPlainText: postsTable.contentPlainText,
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
    },
    contentCategory: {
      id: contentCategoriesTable.id,
      slug: contentCategoriesTable.slug,
      name: contentCategoriesTable.name
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

function videoSelection() {
  return {
    id: videoAssetsTable.id,
    postId: videoAssetsTable.postId,
    ownerId: videoAssetsTable.ownerId,
    fileName: videoAssetsTable.fileName,
    mimeType: videoAssetsTable.mimeType,
    byteSize: videoAssetsTable.byteSize,
    url: videoAssetsTable.dataUrl
  };
}

export const postsRepo = {
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
  async syncPostCommentCount(postId: string) {
    const rows = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(postCommentsTable)
      .where(and(eq(postCommentsTable.postId, postId), eq(postCommentsTable.status, "visible")));

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

    const counts = { like: 0, favorite: 0, share: 0 };

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
  async createVideoUpload(input: {
    ownerId: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    dataUrl: string;
  }) {
    const id = createId("video");

    await db.insert(videoAssetsTable).values({
      id,
      ownerId: input.ownerId,
      postId: null,
      fileName: input.fileName,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      dataUrl: input.dataUrl
    });

    return this.getVideoUploadById(id);
  },
  async getImageUploadById(id: string) {
    const rows = await db
      .select(imageSelection())
      .from(postImagesTable)
      .where(eq(postImagesTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async getVideoUploadById(id: string) {
    const rows = await db
      .select(videoSelection())
      .from(videoAssetsTable)
      .where(eq(videoAssetsTable.id, id))
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
  async listOwnedUnattachedVideos(ownerId: string, videoIds: string[]) {
    if (videoIds.length === 0) {
      return [];
    }

    return db
      .select(videoSelection())
      .from(videoAssetsTable)
      .where(
        and(
          eq(videoAssetsTable.ownerId, ownerId),
          inArray(videoAssetsTable.id, videoIds),
          sql`${videoAssetsTable.postId} is null`
        )
      );
  },
  async listOwnedAttachableImages(ownerId: string, imageIds: string[], postId: string) {
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
          or(sql`${postImagesTable.postId} is null`, eq(postImagesTable.postId, postId))
        )
      );
  },
  async listOwnedAttachableVideos(ownerId: string, videoIds: string[], postId: string) {
    if (videoIds.length === 0) {
      return [];
    }

    return db
      .select(videoSelection())
      .from(videoAssetsTable)
      .where(
        and(
          eq(videoAssetsTable.ownerId, ownerId),
          inArray(videoAssetsTable.id, videoIds),
          or(sql`${videoAssetsTable.postId} is null`, eq(videoAssetsTable.postId, postId))
        )
      );
  },
  async attachImagesToPost(postId: string, ownerId: string, imageIds: string[]) {
    if (imageIds.length === 0) {
      return;
    }

    await db
      .update(postImagesTable)
      .set({ postId })
      .where(
        and(
          eq(postImagesTable.ownerId, ownerId),
          inArray(postImagesTable.id, imageIds),
          sql`${postImagesTable.postId} is null`
        )
      );
  },
  async attachVideosToPost(postId: string, ownerId: string, videoIds: string[]) {
    if (videoIds.length === 0) {
      return;
    }

    await db
      .update(videoAssetsTable)
      .set({ postId })
      .where(
        and(
          eq(videoAssetsTable.ownerId, ownerId),
          inArray(videoAssetsTable.id, videoIds),
          sql`${videoAssetsTable.postId} is null`
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
  async listPostVideos(postIds: string[]) {
    if (postIds.length === 0) {
      return [];
    }

    return db
      .select(videoSelection())
      .from(videoAssetsTable)
      .where(and(inArray(videoAssetsTable.postId, postIds), sql`${videoAssetsTable.postId} is not null`))
      .orderBy(videoAssetsTable.createdAt);
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
      .where(and(eq(postInteractionsTable.userId, userId), inArray(postInteractionsTable.postId, postIds)));
  },
  async createPost(input: {
    authorId: string;
    type: PostType;
    title: string;
    content: string;
    contentHtml: string | null;
    contentPlainText: string;
    contentCategoryId: string | null;
    status: PostStatus;
    publishedAt: Date | null;
    imageIds: string[];
    videoIds: string[];
  }) {
    const id = createId("post");

    await db.insert(postsTable).values({
      id,
      authorId: input.authorId,
      type: input.type,
      title: input.title,
      content: input.content,
      contentHtml: input.contentHtml,
      contentPlainText: input.contentPlainText,
      contentCategoryId: input.contentCategoryId,
      status: input.status,
      commentCount: 0,
      reportCount: 0,
      likeCount: 0,
      favoriteCount: 0,
      shareCount: 0,
      publishedAt: input.publishedAt
    });

    await this.attachImagesToPost(id, input.authorId, input.imageIds);
    await this.attachVideosToPost(id, input.authorId, input.videoIds);
    return this.getPostById(id);
  },
  async replacePostImages(postId: string, ownerId: string, imageIds: string[]) {
    if (imageIds.length === 0) {
      await db
        .update(postImagesTable)
        .set({ postId: null })
        .where(and(eq(postImagesTable.ownerId, ownerId), eq(postImagesTable.postId, postId)));
      return;
    }

    await db
      .update(postImagesTable)
      .set({ postId: null })
      .where(
        and(
          eq(postImagesTable.ownerId, ownerId),
          eq(postImagesTable.postId, postId),
          notInArray(postImagesTable.id, imageIds)
        )
      );

    await db
      .update(postImagesTable)
      .set({ postId })
      .where(
        and(
          eq(postImagesTable.ownerId, ownerId),
          inArray(postImagesTable.id, imageIds),
          or(sql`${postImagesTable.postId} is null`, eq(postImagesTable.postId, postId))
        )
      );
  },
  async replacePostVideos(postId: string, ownerId: string, videoIds: string[]) {
    if (videoIds.length === 0) {
      await db
        .update(videoAssetsTable)
        .set({ postId: null })
        .where(and(eq(videoAssetsTable.ownerId, ownerId), eq(videoAssetsTable.postId, postId)));
      return;
    }

    await db
      .update(videoAssetsTable)
      .set({ postId: null })
      .where(
        and(
          eq(videoAssetsTable.ownerId, ownerId),
          eq(videoAssetsTable.postId, postId),
          notInArray(videoAssetsTable.id, videoIds)
        )
      );

    await db
      .update(videoAssetsTable)
      .set({ postId })
      .where(
        and(
          eq(videoAssetsTable.ownerId, ownerId),
          inArray(videoAssetsTable.id, videoIds),
          or(sql`${videoAssetsTable.postId} is null`, eq(videoAssetsTable.postId, postId))
        )
      );
  },
  async updateOfficialArticle(input: {
    id: string;
    ownerId: string;
    title: string;
    content: string;
    contentHtml: string | null;
    contentCategoryId: string;
    imageIds: string[];
    videoIds: string[];
  }) {
    await db
      .update(postsTable)
      .set({
        title: input.title,
        content: input.content,
        contentHtml: input.contentHtml,
        contentPlainText: input.content,
        contentCategoryId: input.contentCategoryId,
        updatedAt: new Date()
      })
      .where(eq(postsTable.id, input.id));

    await this.replacePostImages(input.id, input.ownerId, input.imageIds);
    await this.replacePostVideos(input.id, input.ownerId, input.videoIds);

    return this.getPostById(input.id);
  },
  async getPostById(id: string) {
    const rows = await db
      .select(postSelection())
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .leftJoin(contentCategoriesTable, eq(postsTable.contentCategoryId, contentCategoriesTable.id))
      .where(eq(postsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async listFeed(input: {
    tab: FeedTab;
    type: PostType;
    currentUserId?: string | null;
    contentCategorySlug?: string;
  }) {
    const conditions = [
      eq(postsTable.status, "published"),
      eq(postsTable.type, input.type)
    ];

    if (input.type === "article" && input.contentCategorySlug) {
      conditions.push(eq(contentCategoriesTable.slug, input.contentCategorySlug));
    }

    const baseQuery = db
      .select(postSelection())
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .leftJoin(contentCategoriesTable, eq(postsTable.contentCategoryId, contentCategoriesTable.id))
      .where(and(...conditions));

    if (input.tab === "following") {
      if (!input.currentUserId) {
        return [];
      }

      return baseQuery
        .innerJoin(
          userFollowsTable,
          and(
            eq(userFollowsTable.followeeId, postsTable.authorId),
            eq(userFollowsTable.followerId, input.currentUserId)
          )
        )
        .orderBy(...buildFeedOrder(input.tab));
    }

    return baseQuery.orderBy(...buildFeedOrder(input.tab));
  },
  async listAdminPosts(status?: PostStatus) {
    const query = db
      .select(postSelection())
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .leftJoin(contentCategoriesTable, eq(postsTable.contentCategoryId, contentCategoriesTable.id))
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
        publishedAt: status === "published" ? existing.publishedAt ?? new Date() : existing.publishedAt,
        updatedAt: new Date()
      })
      .where(eq(postsTable.id, id));

    return this.getPostById(id);
  },
  async listCommentsForViewer(postId: string, viewerId?: string | null) {
    const baseConditions = [eq(postCommentsTable.postId, postId)];
    const visibilityCondition = viewerId
      ? or(
          eq(postCommentsTable.status, "visible"),
          and(eq(postCommentsTable.status, "pending"), eq(postCommentsTable.authorId, viewerId))
        )
      : eq(postCommentsTable.status, "visible");

    return db
      .select({
        id: postCommentsTable.id,
        postId: postCommentsTable.postId,
        authorId: postCommentsTable.authorId,
        parentCommentId: postCommentsTable.parentCommentId,
        replyToCommentId: postCommentsTable.replyToCommentId,
        replyToUserId: postCommentsTable.replyToUserId,
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
      .where(and(...baseConditions, visibilityCondition))
      .orderBy(asc(postCommentsTable.createdAt));
  },
  async listCommentThreadEntries(postId: string) {
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
        replyToCommentId: postCommentsTable.replyToCommentId,
        replyToUserId: postCommentsTable.replyToUserId,
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
    parentCommentId: string | null;
    replyToCommentId: string | null;
    replyToUserId: string | null;
    content: string;
    status: PostCommentStatus;
  }) {
    const id = createId("comment");

    await db.insert(postCommentsTable).values({
      id,
      postId: input.postId,
      authorId: input.authorId,
      parentCommentId: input.parentCommentId,
      replyToCommentId: input.replyToCommentId,
      replyToUserId: input.replyToUserId,
      content: input.content,
      status: input.status
    });

    await this.syncPostCommentCount(input.postId);
    return this.getCommentById(id);
  },
  async deleteCommentThread(commentId: string, postId: string) {
    const existing = await this.getCommentById(commentId);
    if (!existing || existing.postId !== postId) {
      return 0;
    }

    const threadRootId = existing.parentCommentId ?? existing.id;
    await db
      .delete(postCommentsTable)
      .where(
        and(
          eq(postCommentsTable.postId, postId),
          or(
            eq(postCommentsTable.id, threadRootId),
            eq(postCommentsTable.parentCommentId, threadRootId)
          )
        )
      );

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
      .select({ id: postInteractionsTable.id })
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
      await db.delete(postInteractionsTable).where(eq(postInteractionsTable.id, existing[0].id));
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

    return true;
  },
  async listAdminComments(status?: PostCommentStatus) {
    const query = db
      .select({
        id: postCommentsTable.id,
        postId: postCommentsTable.postId,
        postTitle: postsTable.title,
        parentCommentId: postCommentsTable.parentCommentId,
        replyToCommentId: postCommentsTable.replyToCommentId,
        replyToUserId: postCommentsTable.replyToUserId,
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

    const rootId = existing.parentCommentId ?? existing.id;
    await db
      .update(postCommentsTable)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(postCommentsTable.postId, existing.postId),
          or(eq(postCommentsTable.id, rootId), eq(postCommentsTable.parentCommentId, rootId))
        )
      );

    await this.syncPostCommentCount(existing.postId);
    return this.getCommentById(id);
  }
};
