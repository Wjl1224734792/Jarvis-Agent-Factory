import {
  contentCategoriesTable,
  createId,
  db,
  postCommentsTable,
  postCommentLikesTable,
  postCommentReportsTable,
  postInteractionsTable,
  postReportsTable,
  postsTable,
  userFollowsTable,
  usersTable
} from "@feijia/db";
import { and, asc, desc, eq, inArray, or, sql, type SQLWrapper } from "drizzle-orm";
import { uploadsRepo } from "../uploads/upload.repo";

type FeedTab = "recommended" | "latest" | "following";
type PostStatus = "pending" | "published" | "rejected" | "hidden";
type PostType = "article" | "moment";
type PostCommentStatus = "pending" | "visible" | "hidden";
type PostInteractionType = "like" | "favorite" | "share";

function buildFeedPublishedAtExpression() {
  return sql`coalesce(${postsTable.publishedAt}, ${postsTable.createdAt})`;
}

function buildRecommendationEngagementVolumeExpression() {
  return sql<number>`
    (
      ${postsTable.likeCount} +
      ${postsTable.favoriteCount} +
      ${postsTable.shareCount} +
      ${postsTable.commentCount}
    )
  `;
}

function buildRecommendationAgeHoursExpression() {
  return sql<number>`
    greatest(
      0,
      extract(epoch from now() - ${buildFeedPublishedAtExpression()}) / 3600.0
    )
  `;
}

function buildRecommendationInteractionScoreExpression(type: PostType) {
  const likeWeight = type === "article" ? 16 : 12;
  const favoriteWeight = type === "article" ? 14 : 10;
  const shareWeight = type === "article" ? 12 : 18;
  const commentWeight = type === "article" ? 15 : 9;
  const viewWeight = type === "article" ? 7 : 8;

  return sql<number>`
    (
      (ln(1 + ${postsTable.likeCount}) * ${likeWeight}) +
      (ln(1 + ${postsTable.favoriteCount}) * ${favoriteWeight}) +
      (ln(1 + ${postsTable.shareCount}) * ${shareWeight}) +
      (ln(1 + ${postsTable.commentCount}) * ${commentWeight}) +
      (ln(1 + ${postsTable.viewCount}) * ${viewWeight})
    )
  `;
}

function buildRecommendationFreshnessMultiplierExpression(type: PostType) {
  const halfLife = type === "article" ? 42 : 22;

  return sql<number>`
    power(0.5, ${buildRecommendationAgeHoursExpression()} / ${halfLife})
  `;
}

function buildTrimmedTextLengthExpression(value: SQLWrapper) {
  return sql<number>`char_length(btrim(coalesce(${value}, '')))`;
}

function buildFeedPreviewDisplayLengthExpression() {
  const previewSource = buildFeedPreviewSource();

  return sql<number>`
    (
      case
        when char_length(coalesce(${previewSource}, '')) > 160
          then char_length(btrim(substring(${previewSource} from 1 for 160) || '...'))
        else char_length(btrim(coalesce(${previewSource}, '')))
      end
    )
  `;
}

function buildRecommendationLengthBalanceExpression(
  lengthExpression: SQLWrapper,
  input: { min: number; max: number; bestAt: number; weight: number }
) {
  const spread = Math.max(1, input.max - input.min);

  return sql<number>`
    (
      case
        when ${lengthExpression} = 0 then ${-input.weight}
        when ${lengthExpression} < ${input.min}
          then (${input.weight} * (${lengthExpression}::numeric / ${input.min})) - ${input.weight}
        when ${lengthExpression} > ${input.max}
          then ${-input.weight}
        else
          ${input.weight} * (
            1 - (abs(${lengthExpression} - ${input.bestAt})::numeric / ${spread})
          )
      end
    )
  `;
}

function buildRecommendedFollowBoostExpression(type: PostType, currentUserId?: string | null) {
  if (!currentUserId) {
    return sql<number>`0`;
  }

  const followBoost = type === "article" ? 10 : 8;
  return sql<number>`
    (
      case
        when exists (
          select 1
          from ${userFollowsTable}
          where ${userFollowsTable.followeeId} = ${postsTable.authorId}
            and ${userFollowsTable.followerId} = ${currentUserId}
        ) then ${followBoost}
        else 0
      end
    )
  `;
}

function buildRecommendedStaticBaseScoreExpression(
  type: PostType,
  currentUserId?: string | null
) {
  const interactionScore = buildRecommendationInteractionScoreExpression(type);
  const freshnessMultiplier = buildRecommendationFreshnessMultiplierExpression(type);
  const freshnessBoostWeight = type === "article" ? 32 : 28;
  const officialBoost =
    type === "article"
      ? sql<number>`(case when ${usersTable.role} = 'admin' then 5 else 0 end)`
      : sql<number>`0`;
  const titleQuality = buildRecommendationLengthBalanceExpression(
    buildTrimmedTextLengthExpression(postsTable.title),
    {
      min: 6,
      max: 60,
      bestAt: 24,
      weight: type === "article" ? 7 : 4
    }
  );
  const previewQuality = buildRecommendationLengthBalanceExpression(
    buildFeedPreviewDisplayLengthExpression(),
    {
      min: type === "article" ? 36 : 18,
      max: type === "article" ? 260 : 120,
      bestAt: type === "article" ? 120 : 48,
      weight: type === "article" ? 9 : 5
    }
  );
  const engagementVolume = buildRecommendationEngagementVolumeExpression();
  const reportPenalty = sql<number>`
    (
      case
        when ${postsTable.reportCount} >= 3
          and (${postsTable.reportCount} * 2) >= greatest(1, ${engagementVolume})
          then least(24, ${postsTable.reportCount} * 4)
        when ${postsTable.reportCount} > 0
          then least(10, ${postsTable.reportCount} * 1.8)
        else 0
      end
    )
  `;
  const staleLowValuePenalty = sql<number>`
    (
      case
        when ${buildRecommendationAgeHoursExpression()} > ${type === "article" ? 120 : 72}
          and ${interactionScore} < 20
          then -12
        else 0
      end
    )
  `;

  return sql<number>`
    (
      (${interactionScore} * (0.58 + (${freshnessMultiplier} * 0.42))) +
      (${freshnessMultiplier} * ${freshnessBoostWeight}) +
      ${buildRecommendedFollowBoostExpression(type, currentUserId)} +
      ${officialBoost} +
      ${titleQuality} +
      ${previewQuality} -
      ${reportPenalty} +
      ${staleLowValuePenalty}
    )
  `;
}

function buildRecommendedCandidateConditions(type: PostType) {
  const engagementVolumeExpression = buildRecommendationEngagementVolumeExpression();
  const publishedAtExpression = buildFeedPublishedAtExpression();
  const staleWindowDays = type === "article" ? 540 : 365;
  const staleEngagementFloor = type === "article" ? 4 : 3;
  const staleViewFloor = type === "article" ? 40 : 25;

  return [
    // Gate heavy-report, low-trust candidates before service-side reranking.
    sql`(
      ${postsTable.reportCount} < 3 or
      (${postsTable.reportCount} * 2) < (${engagementVolumeExpression} + 2) or
      (${postsTable.reportCount} * 3) < (${postsTable.viewCount} + 6)
    )`,
    // Trim very old, low-value rows while retaining proven historical content.
    sql`(
      ${publishedAtExpression} >= now() - make_interval(days => ${staleWindowDays}) or
      ${engagementVolumeExpression} >= ${staleEngagementFloor} or
      ${postsTable.shareCount} > 0 or
      ${postsTable.viewCount} >= ${staleViewFloor}
    )`
  ];
}

function buildFeedOrder(tab: FeedTab, type: PostType, currentUserId?: string | null) {
  if (tab === "recommended") {
    return [
      desc(buildRecommendedStaticBaseScoreExpression(type, currentUserId)),
      desc(buildFeedPublishedAtExpression()),
      desc(postsTable.updatedAt)
    ] as const;
  }

  return [desc(buildFeedPublishedAtExpression())] as const;
}

const FEED_PREVIEW_SOURCE_LENGTH = 161;

function buildFeedPreviewSource() {
  return sql<string>`
    substring(
      coalesce(${postsTable.contentPlainText}, ${postsTable.content}, '')
      from 1 for ${FEED_PREVIEW_SOURCE_LENGTH}
    )
  `;
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
    rejectionReason: postsTable.rejectionReason,
    coverImageFileId: postsTable.coverImageFileId,
    commentCount: postsTable.commentCount,
    reportCount: postsTable.reportCount,
    likeCount: postsTable.likeCount,
    favoriteCount: postsTable.favoriteCount,
    shareCount: postsTable.shareCount,
    viewCount: postsTable.viewCount,
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

function postFeedSelection(input: {
  type: PostType;
  currentUserId?: string | null;
  includeRecommendationBaseScore: boolean;
}) {
  const previewSource = buildFeedPreviewSource();
  const recommendationBaseScore = input.includeRecommendationBaseScore
    ? buildRecommendedStaticBaseScoreExpression(input.type, input.currentUserId)
    : sql<number | null>`null`;

  return {
    id: postsTable.id,
    type: postsTable.type,
    title: postsTable.title,
    content: previewSource,
    contentHtml: sql<string | null>`null`,
    contentPlainText: previewSource,
    status: postsTable.status,
    rejectionReason: postsTable.rejectionReason,
    coverImageFileId: postsTable.coverImageFileId,
    commentCount: postsTable.commentCount,
    reportCount: postsTable.reportCount,
    likeCount: postsTable.likeCount,
    favoriteCount: postsTable.favoriteCount,
    shareCount: postsTable.shareCount,
    viewCount: postsTable.viewCount,
    createdAt: postsTable.createdAt,
    updatedAt: postsTable.updatedAt,
    publishedAt: postsTable.publishedAt,
    recommendationBaseScore,
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
  async incrementPostViewCount(postId: string) {
    await db
      .update(postsTable)
      .set({
        viewCount: sql`${postsTable.viewCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(postsTable.id, postId));
  },
  async syncPostCommentEngagementCounts(commentId: string) {
    const [likes, reports] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(postCommentLikesTable)
        .where(eq(postCommentLikesTable.commentId, commentId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(postCommentReportsTable)
        .where(eq(postCommentReportsTable.commentId, commentId))
    ]);

    await db
      .update(postCommentsTable)
      .set({
        likeCount: Number(likes[0]?.count ?? 0),
        reportCount: Number(reports[0]?.count ?? 0),
        updatedAt: new Date()
      })
      .where(eq(postCommentsTable.id, commentId));
  },
  async getImageUploadById(id: string) {
    const file = await uploadsRepo.getFileById(id);
    return file?.mediaKind === "image" ? file : null;
  },
  async getVideoUploadById(id: string) {
    const file = await uploadsRepo.getFileById(id);
    return file?.mediaKind === "video" ? file : null;
  },
  async listOwnedUnattachedImages(ownerId: string, imageIds: string[]) {
    return uploadsRepo.listOwnedAttachableFiles({
      ownerId,
      fileIds: imageIds,
      mediaKind: "image"
    });
  },
  async listOwnedUnattachedVideos(ownerId: string, videoIds: string[]) {
    return uploadsRepo.listOwnedAttachableFiles({
      ownerId,
      fileIds: videoIds,
      mediaKind: "video"
    });
  },
  async listOwnedAttachableImages(ownerId: string, imageIds: string[], postId: string) {
    return uploadsRepo.listOwnedAttachableFiles({
      ownerId,
      fileIds: imageIds,
      mediaKind: "image",
      postId
    });
  },
  async listOwnedAttachableVideos(ownerId: string, videoIds: string[], postId: string) {
    return uploadsRepo.listOwnedAttachableFiles({
      ownerId,
      fileIds: videoIds,
      mediaKind: "video",
      postId
    });
  },
  async attachImagesToPost(postId: string, ownerId: string, imageIds: string[]) {
    await uploadsRepo.replacePostFiles({
      postId,
      ownerId,
      mediaKind: "image",
      fileIds: imageIds
    });
  },
  async attachVideosToPost(postId: string, ownerId: string, videoIds: string[]) {
    await uploadsRepo.replacePostFiles({
      postId,
      ownerId,
      mediaKind: "video",
      fileIds: videoIds
    });
  },
  async listPostImages(postIds: string[]) {
    return uploadsRepo.listPostFiles(postIds, "image");
  },
  async listPostVideos(postIds: string[]) {
    return uploadsRepo.listPostFiles(postIds, "video");
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
    rejectionReason?: string | null;
    publishedAt: Date | null;
    coverImageFileId: string | null;
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
      coverImageFileId: input.coverImageFileId,
      status: input.status,
      rejectionReason: input.rejectionReason ?? null,
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
    await uploadsRepo.replacePostFiles({
      postId,
      ownerId,
      mediaKind: "image",
      fileIds: imageIds
    });
  },
  async replacePostVideos(postId: string, ownerId: string, videoIds: string[]) {
    await uploadsRepo.replacePostFiles({
      postId,
      ownerId,
      mediaKind: "video",
      fileIds: videoIds
    });
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
  async updatePost(input: {
    id: string;
    title: string;
    content: string;
    contentHtml: string | null;
    contentPlainText: string;
    contentCategoryId: string | null;
    status: PostStatus;
    rejectionReason?: string | null;
    ownerId: string;
    coverImageFileId: string | null;
    imageIds: string[];
    videoIds: string[];
  }) {
    await db
      .update(postsTable)
      .set({
        title: input.title,
        content: input.content,
        contentHtml: input.contentHtml,
        contentPlainText: input.contentPlainText,
        contentCategoryId: input.contentCategoryId,
        coverImageFileId: input.coverImageFileId,
        status: input.status,
        rejectionReason: input.rejectionReason ?? null,
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
  async getPostViewStateById(id: string) {
    const rows = await db
      .select({
        id: postsTable.id,
        status: postsTable.status
      })
      .from(postsTable)
      .where(eq(postsTable.id, id))
      .limit(1);

    return rows[0] ?? null;
  },
  async listFeed(input: {
    tab: FeedTab;
    type: PostType;
    currentUserId?: string | null;
    contentCategorySlug?: string;
    page: number;
    limit: number;
    recommendedWindowOffset?: number;
    recommendedWindowLimit?: number;
  }) {
    const conditions = [
      eq(postsTable.status, "published"),
      eq(postsTable.type, input.type)
    ];

    if (input.tab === "recommended") {
      conditions.push(...buildRecommendedCandidateConditions(input.type));
    }

    if (input.type === "article" && input.contentCategorySlug) {
      conditions.push(eq(contentCategoriesTable.slug, input.contentCategorySlug));
    }

    const offset = (input.page - 1) * input.limit;
    const queryOffset =
      input.tab === "recommended" ? input.recommendedWindowOffset ?? offset : offset;
    const queryLimit =
      input.tab === "recommended" ? input.recommendedWindowLimit ?? input.limit : input.limit;
    const baseCountQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(postsTable)
      .leftJoin(contentCategoriesTable, eq(postsTable.contentCategoryId, contentCategoriesTable.id))
      .where(and(...conditions));

    const baseQuery = db
      .select(
        postFeedSelection({
          type: input.type,
          currentUserId: input.currentUserId,
          includeRecommendationBaseScore: input.tab === "recommended"
        })
      )
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .leftJoin(contentCategoriesTable, eq(postsTable.contentCategoryId, contentCategoriesTable.id))
      .where(and(...conditions));

    if (input.tab === "following") {
      if (!input.currentUserId) {
        return { items: [], total: 0 };
      }

      const [rows, countRows] = await Promise.all([
        baseQuery
          .innerJoin(
            userFollowsTable,
            and(
              eq(userFollowsTable.followeeId, postsTable.authorId),
              eq(userFollowsTable.followerId, input.currentUserId)
            )
          )
          .orderBy(...buildFeedOrder(input.tab, input.type, input.currentUserId))
          .limit(queryLimit)
          .offset(queryOffset),
        baseCountQuery.innerJoin(
          userFollowsTable,
          and(
            eq(userFollowsTable.followeeId, postsTable.authorId),
            eq(userFollowsTable.followerId, input.currentUserId)
          )
        )
      ]);

      return {
        items: rows,
        total: Number(countRows[0]?.count ?? 0)
      };
    }

    const [rows, countRows] = await Promise.all([
      baseQuery
        .orderBy(...buildFeedOrder(input.tab, input.type, input.currentUserId))
        .limit(queryLimit)
        .offset(queryOffset),
      baseCountQuery
    ]);

    return {
      items: rows,
      total: Number(countRows[0]?.count ?? 0)
    };
  },
  async listFeedPageContentHtmlByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return db
      .select({
        id: postsTable.id,
        contentHtml: postsTable.contentHtml
      })
      .from(postsTable)
      .where(inArray(postsTable.id, ids));
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
  async updatePostStatus(id: string, status: PostStatus, rejectionReason?: string | null) {
    const existing = await this.getPostById(id);
    if (!existing) {
      return null;
    }

    await db
      .update(postsTable)
      .set({
        status,
        rejectionReason: status === "rejected" ? rejectionReason ?? null : null,
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
        likeCount: postCommentsTable.likeCount,
        reportCount: postCommentsTable.reportCount,
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
        likeCount: postCommentsTable.likeCount,
        reportCount: postCommentsTable.reportCount,
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
  async updateComment(id: string, content: string) {
    await db
      .update(postCommentsTable)
      .set({
        content,
        updatedAt: new Date()
      })
      .where(eq(postCommentsTable.id, id));

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
  async listViewerCommentLikes(commentIds: string[], userId: string) {
    if (commentIds.length === 0) {
      return [];
    }

    return db
      .select({
        commentId: postCommentLikesTable.commentId
      })
      .from(postCommentLikesTable)
      .where(
        and(
          eq(postCommentLikesTable.userId, userId),
          inArray(postCommentLikesTable.commentId, commentIds)
        )
      );
  },
  async listViewerCommentReports(commentIds: string[], userId: string) {
    if (commentIds.length === 0) {
      return [];
    }

    return db
      .select({
        commentId: postCommentReportsTable.commentId
      })
      .from(postCommentReportsTable)
      .where(
        and(
          eq(postCommentReportsTable.reporterId, userId),
          inArray(postCommentReportsTable.commentId, commentIds)
        )
      );
  },
  async toggleCommentLike(commentId: string, userId: string) {
    const existing = await db
      .select({ id: postCommentLikesTable.id })
      .from(postCommentLikesTable)
      .where(
        and(
          eq(postCommentLikesTable.commentId, commentId),
          eq(postCommentLikesTable.userId, userId)
        )
      )
      .limit(1);

    let active = false;
    if (existing.length > 0) {
      await db.delete(postCommentLikesTable).where(eq(postCommentLikesTable.id, existing[0].id));
    } else {
      await db.insert(postCommentLikesTable).values({
        id: createId("pclike"),
        commentId,
        userId
      });
      active = true;
    }

    await this.syncPostCommentEngagementCounts(commentId);
    return { active };
  },
  async createCommentReport(input: {
    commentId: string;
    reporterId: string;
    reason: string;
    imageFileIds: string;
  }) {
    await db
      .insert(postCommentReportsTable)
      .values({
        id: createId("pcreport"),
        commentId: input.commentId,
        reporterId: input.reporterId,
        reason: input.reason,
        imageFileIds: input.imageFileIds
      })
      .onConflictDoNothing();

    await this.syncPostCommentEngagementCounts(input.commentId);
    return true;
  },
  async createReport(input: {
    postId: string;
    reporterId: string;
    reason: string;
    imageFileIds: string;
  }) {
    const id = createId("report");

    await db
      .insert(postReportsTable)
      .values({
        id,
        postId: input.postId,
        reporterId: input.reporterId,
        reason: input.reason,
        imageFileIds: input.imageFileIds
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
  async listPostReports(postId: string) {
    return db
      .select({
        id: postReportsTable.id,
        reason: postReportsTable.reason,
        imageFileIds: postReportsTable.imageFileIds,
        createdAt: postReportsTable.createdAt,
        reporter: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(postReportsTable)
      .innerJoin(usersTable, eq(postReportsTable.reporterId, usersTable.id))
      .where(eq(postReportsTable.postId, postId))
      .orderBy(desc(postReportsTable.createdAt));
  },
  async listCommentReports(commentId: string) {
    return db
      .select({
        id: postCommentReportsTable.id,
        reason: postCommentReportsTable.reason,
        imageFileIds: postCommentReportsTable.imageFileIds,
        createdAt: postCommentReportsTable.createdAt,
        reporter: {
          id: usersTable.id,
          displayName: usersTable.displayName,
          avatarFileId: usersTable.avatarFileId,
          role: usersTable.role
        }
      })
      .from(postCommentReportsTable)
      .innerJoin(usersTable, eq(postCommentReportsTable.reporterId, usersTable.id))
      .where(eq(postCommentReportsTable.commentId, commentId))
      .orderBy(desc(postCommentReportsTable.createdAt));
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
        reportCount: postCommentsTable.reportCount,
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
