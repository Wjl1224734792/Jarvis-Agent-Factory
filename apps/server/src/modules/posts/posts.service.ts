import {
  isValidAuthRole,
  isValidPostType,
  isValidPostStatus
} from "../../lib/type-guards";
import { contentCategoriesService } from "../content-categories/content-categories.service";
import { socialService } from "../social/social.service";
import { uploadsRepo } from "../uploads/upload.repo";
import { resolveUploadedFileUrls } from "../uploads/uploads.helpers";
import { buildReplyToUserMap } from "../../lib/comment-serializer";
import { postsRepo } from "./posts.repo";
import { createPostsCommentWriteService } from "./posts-comment-write-service";
import {
  decodeFeedCursor,
  encodeFeedCursor,
  FEED_CURSOR_VERSION,
  resolveFeedCursorTime
} from "./feed-cursor";
import { buildCoversByPostId, buildImagesByPostId, buildVideosByPostId } from "./post-media";
import {
  serializeAdminOfficialArticleDetail,
  serializeAdminPostList
} from "./posts-admin-presenters";
import {
  serializeAdminCommentList,
} from "./posts-admin-comment-presenters";
import { createPostsWriteService } from "./posts-write-service";
import {
  buildCommentStateSet,
  buildPublicUserSummary,
  buildInteractionMap,
  parseFileIdArray,
  serializeCommentThreads,
  serializePostListItem,
  serializePostSource,
  serializeContentDeclaration,
  toIsoString,
  toViewerState
} from "./posts-presenters";
import { usersService } from "../users/users.service";

type CurrentUser = {
  id: string;
  role: "user" | "admin";
};

type FeedTab = "recommended" | "latest" | "following";
type PostStatus = "pending" | "published" | "rejected" | "hidden";
type PostType = "article" | "moment";
type PostCommentStatus = "pending" | "visible" | "hidden";
type PostInteractionType = "like" | "favorite" | "share";
type CommentSort = "hot" | "latest";
const DEFAULT_FEED_LIMIT = 20;
const MAX_FEED_LIMIT = 50;

async function validateOwnedReportImages(ownerId: string, imageIds: string[]) {
  return uploadsRepo.listOwnedUploadedFiles({
    ownerId,
    fileIds: imageIds,
    mediaKind: "image",
    bizType: "report-image"
  });
}

const postsWriteService = createPostsWriteService({
  validateOwnedReportImages,
  getPostDetail: (id, currentUser, options) =>
    postsService.getPostDetail(id, currentUser, options)
});

const postsCommentWriteService = createPostsCommentWriteService({
  validateOwnedReportImages
});

/**
 * Orchestrates the posts domain across feed reads, detail hydration, write
 * operations and moderation-facing projections.
 *
 * Boundaries:
 * - Centralizes cross-repo composition such as media hydration, viewer state,
 *   comment-thread shaping, moderation defaults and notification side effects.
 * - Enforces post-specific invariants here before persistence, for example
 *   moment media exclusivity, cover resolution and ownership checks.
 * - Does not own HTTP concerns or raw SQL details; routes validate transport
 *   input and repos remain the source of persistence primitives.
 */
export const postsService = {
  async listFeed(
    tab: FeedTab,
    currentUser: CurrentUser | null | undefined,
    input: { type: PostType; contentCategorySlug?: string; limit?: number; cursor?: string }
  ) {
    const limit = Math.min(MAX_FEED_LIMIT, Math.max(1, input.limit ?? DEFAULT_FEED_LIMIT));
    const decodedCursor = decodeFeedCursor(input.cursor);
    const recommendationNow =
      tab === "recommended"
        ? decodedCursor?.kind === "recommended"
          ? decodedCursor.recommendationNow
          : new Date()
        : undefined;
    const feedResult = await postsRepo.listFeed({
      tab,
      type: input.type,
      currentUserId: currentUser?.id,
      contentCategorySlug: input.contentCategorySlug,
      feedCursor:
        tab !== "recommended" && decodedCursor?.kind === "feed"
          ? {
              publishedAt: decodedCursor.publishedAt,
              id: decodedCursor.id
            }
          : undefined,
      recommendedCursor:
        tab === "recommended" && decodedCursor?.kind === "recommended"
          ? {
              score: decodedCursor.score,
              publishedAt: decodedCursor.publishedAt,
              id: decodedCursor.id
            }
          : undefined,
      recommendationNow,
      includeTotal: false,
      limit: limit + 1
    });
    const hasMore = feedResult.items.length > limit;
    const items = hasMore ? feedResult.items.slice(0, limit) : feedResult.items;
    const postIds = items.map((item) => item.id);
    const authorIds = items.map((item) => item.author.id);
    const [interactions, followingAuthorIds, ipLocationLabelMap] = await Promise.all([
      currentUser ? postsRepo.listViewerInteractions(postIds, currentUser.id) : [],
      currentUser ? socialService.listFollowingStateSet(currentUser.id, authorIds) : new Set<string>(),
      usersService.resolvePublicIpLocationLabelMap(authorIds)
    ]);
    const interactionMap = buildInteractionMap(interactions);
    const orderedItems = items
      .map((item) =>
        serializePostListItem(item, {
          cover: null,
          images: [],
          videos: [],
          viewer: toViewerState({
            authorId: item.author.id,
            currentUser,
            followingAuthorIds,
            interactionTypes: interactionMap.get(item.id)
          }),
          ipLocationLabelMap
        })
      )
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const lastItem = items.at(-1) ?? null;
    const nextCursor =
      hasMore && lastItem
        ? tab === "recommended"
          ? encodeFeedCursor({
              v: FEED_CURSOR_VERSION,
              t: "recommended",
              s: typeof lastItem.recommendationBaseScore === "number" ? lastItem.recommendationBaseScore : 0,
              n: recommendationNow?.toISOString() ?? new Date().toISOString(),
              p: resolveFeedCursorTime(lastItem).toISOString(),
              i: lastItem.id
            })
          : encodeFeedCursor({
              v: FEED_CURSOR_VERSION,
              t: "feed",
              p: resolveFeedCursorTime(lastItem).toISOString(),
              i: lastItem.id
            })
        : null;
    const pagePostIds = orderedItems.map((item) => item.id);
    const pagePostRecords = items;
    const [images, videos, pageContentHtmlRows] = await Promise.all([
      postsRepo.listPostImages(pagePostIds),
      postsRepo.listPostVideos(pagePostIds),
      postsRepo.listFeedPageContentHtmlByIds(pagePostIds)
    ]);
    const [imagesByPostId, videosByPostId, coversByPostId] = await Promise.all([
      buildImagesByPostId(images),
      buildVideosByPostId(videos),
      buildCoversByPostId(pagePostRecords)
    ]);
    const contentHtmlByPostId = new Map(pageContentHtmlRows.map((row) => [row.id, row.contentHtml ?? null]));
    const hydratedItems = orderedItems.map((item) => ({
      ...item,
      contentHtml: contentHtmlByPostId.get(item.id) ?? null,
      cover: coversByPostId.get(item.id) ?? null,
      images: imagesByPostId.get(item.id) ?? [],
      videos: videosByPostId.get(item.id) ?? []
    }));

    if (input.type === "article") {
      const categories = await contentCategoriesService.listEnabledCategories();
      return {
        tab,
        activeCategorySlug: input.contentCategorySlug ?? categories[0]?.slug ?? null,
        categories,
        items: hydratedItems,
        pagination: {
          limit,
          hasMore
        },
        nextCursor
      };
    }

    return {
      tab,
      items: hydratedItems,
      pagination: {
        limit,
        hasMore
      },
      nextCursor
    };
  },
  async createPost(input: {
    authorId: string;
    authorRole: "user" | "admin";
    type: PostType;
    title: string;
    content: string;
    contentHtml: string | null;
    coverImageId: string | null;
    imageIds: string[];
    videoIds: string[];
    contentCategoryId: string | null;
    sourceLabel: string | null;
    sourceUrl: string | null;
    contentSourceType: 'original' | 'repost' | 'translation' | 'adaptation' | 'compilation';
    sourceUsageFlags: string[];
    sourceDescription: string | null;
    aiUseLevel: 'none' | 'assisted' | 'generated';
    aiGeneratedModalities: string[];
  }) {
    return postsWriteService.createPost(input);
  },
  async getPostDetail(
    id: string,
    currentUser?: CurrentUser | null,
    options?: { commentSort?: CommentSort }
  ) {
    const item = await postsRepo.getPostById(id);
    if (!item) {
      return null;
    }

    const canInspectUnpublished = currentUser?.role === "admin" || currentUser?.id === item.author.id;
    if (item.status !== "published" && !canInspectUnpublished) {
      return null;
    }

    const [comments, images, videos, interactions, followingAuthorIds] = await Promise.all([
      postsRepo.listCommentsForViewer(id, currentUser?.id),
      postsRepo.listPostImages([id]),
      postsRepo.listPostVideos([id]),
      currentUser ? postsRepo.listViewerInteractions([id], currentUser.id) : [],
      currentUser ? socialService.listFollowingStateSet(currentUser.id, [item.author.id]) : new Set<string>()
    ]);
    const commentIds = comments.map((comment) => comment.id);
    const replyToUserIds = Array.from(
      new Set(comments.map((comment) => comment.replyToUserId).filter((value): value is string => Boolean(value)))
    );
    const [replyToUsers, likedComments, reportedComments] = await Promise.all([
      postsRepo.listUsersByIds(replyToUserIds),
      currentUser ? postsRepo.listViewerCommentLikes(commentIds, currentUser.id) : [],
      currentUser ? postsRepo.listViewerCommentReports(commentIds, currentUser.id) : []
    ]);
    const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap([
      item.author.id,
      ...comments.map((comment) => comment.author.id),
      ...replyToUserIds
    ]);
    const replyToUserMap = buildReplyToUserMap(
      replyToUsers.map((replyUser) => ({
        ...replyUser,
        ipLocationLabel: ipLocationLabelMap.get(replyUser.id) ?? null
      }))
    );
    const interactionMap = buildInteractionMap(interactions);
    const likedCommentIds = buildCommentStateSet(likedComments);
    const reportedCommentIds = buildCommentStateSet(reportedComments);
    const [imagesByPostId, videosByPostId, coversByPostId] = await Promise.all([
      buildImagesByPostId(images, canInspectUnpublished ? "internal" : "public"),
      buildVideosByPostId(videos, canInspectUnpublished ? "internal" : "public"),
      buildCoversByPostId([item], canInspectUnpublished ? "internal" : "public")
    ]);

    return {
      item: {
        id: item.id,
        type: isValidPostType(item.type) ? item.type : ("article" satisfies PostType),
        title: item.title,
        content: item.content,
        contentHtml: item.contentHtml,
        status: isValidPostStatus(item.status) ? item.status : ("pending" satisfies PostStatus),
        commentCount: item.commentCount,
        viewCount: item.viewCount ?? 0,
        reportCount: item.reportCount,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        publishedAt: toIsoString(item.publishedAt),
        author: buildPublicUserSummary(item.author, ipLocationLabelMap),
        source: serializePostSource(item),
        contentDeclaration: serializeContentDeclaration(item),
        cover: coversByPostId.get(item.id) ?? null,
        images: imagesByPostId.get(item.id) ?? [],
        videos: videosByPostId.get(item.id) ?? [],
        contentCategory: item.contentCategory?.id
          ? {
              id: item.contentCategory.id,
              slug: item.contentCategory.slug,
              name: item.contentCategory.name
            }
          : null,
        engagement: {
          likeCount: item.likeCount,
          favoriteCount: item.favoriteCount,
          shareCount: item.shareCount,
          viewer: toViewerState({
            authorId: item.author.id,
            currentUser,
            followingAuthorIds,
            interactionTypes: interactionMap.get(item.id)
          })
        },
        comments: serializeCommentThreads(comments, replyToUserMap, {
          currentUserId: currentUser?.id,
          likedCommentIds,
          reportedCommentIds,
          sort: options?.commentSort ?? "hot",
          ipLocationLabelMap
        })
      }
    };
  },
  async listAdminPosts(status?: PostStatus) {
    const items = await postsRepo.listAdminPosts(status);
    return serializeAdminPostList(items);
  },
  async getAdminOfficialArticle(id: string) {
    const item = await postsRepo.getPostById(id);
    return serializeAdminOfficialArticleDetail(item);
  },
  async updateAdminOfficialArticle(
    id: string,
    input: {
      title: string;
      content: string;
      contentHtml: string | null;
      contentCategoryId: string;
      sourceLabel: string | null;
      sourceUrl: string | null;
      contentSourceType: 'original' | 'repost' | 'translation' | 'adaptation' | 'compilation';
      sourceUsageFlags: string[];
      sourceDescription: string | null;
      aiUseLevel: 'none' | 'assisted' | 'generated';
      aiGeneratedModalities: string[];
      imageIds: string[];
      videoIds: string[];
    }
  ) {
    return postsWriteService.updateAdminOfficialArticle(id, input);
  },
  async deleteAdminOfficialArticle(id: string) {
    return postsWriteService.deleteAdminOfficialArticle(id);
  },
  async updatePostStatus(id: string, status: PostStatus, rejectionReason?: string | null) {
    return postsWriteService.updatePostStatus(id, status, rejectionReason);
  },
  async createComment(
    postId: string,
    currentUser: CurrentUser,
    input: {
      content: string;
      parentCommentId?: string;
    }
  ) {
    return postsCommentWriteService.createComment(postId, currentUser, input);
  },
  async updateComment(
    postId: string,
    commentId: string,
    currentUser: CurrentUser,
    input: { content: string }
  ) {
    return postsCommentWriteService.updateComment(
      postId,
      commentId,
      currentUser,
      input
    );
  },
  async deleteComment(postId: string, commentId: string, currentUser: CurrentUser) {
    return postsCommentWriteService.deleteComment(
      postId,
      commentId,
      currentUser
    );
  },
  async toggleCommentLike(postId: string, commentId: string, currentUser: CurrentUser) {
    return postsCommentWriteService.toggleCommentLike(
      postId,
      commentId,
      currentUser
    );
  },
  async reportComment(
    postId: string,
    commentId: string,
    currentUser: CurrentUser,
    input: { reason: string; imageIds: string[] }
  ) {
    return postsCommentWriteService.reportComment(
      postId,
      commentId,
      currentUser,
      input
    );
  },
  async deletePost(id: string, currentUser: CurrentUser) {
    return postsWriteService.deletePost(id, currentUser);
  },
  async updatePost(
    id: string,
    currentUser: CurrentUser,
    input: {
      type: PostType;
      title: string;
      content: string;
      contentHtml: string | null;
      contentCategoryId: string | null;
      coverImageId: string | null;
      sourceLabel: string | null;
      sourceUrl: string | null;
      contentSourceType: 'original' | 'repost' | 'translation' | 'adaptation' | 'compilation';
      sourceUsageFlags: string[];
      sourceDescription: string | null;
      aiUseLevel: 'none' | 'assisted' | 'generated';
      aiGeneratedModalities: string[];
      imageIds: string[];
      videoIds: string[];
    }
  ) {
    return postsWriteService.updatePost(id, currentUser, input);
  },
  async toggleInteraction(postId: string, currentUser: CurrentUser, type: PostInteractionType) {
    return postsWriteService.toggleInteraction(postId, currentUser, type);
  },
  async recordView(
    postId: string,
    input?: {
      currentUserId?: string | null;
      sessionId?: string | null;
      viewerFingerprint?: string | null;
    }
  ) {
    return postsWriteService.recordView(postId, input);
  },
  async reportPost(postId: string, reporterId: string, input: { reason: string; imageIds: string[] }) {
    return postsWriteService.reportPost(postId, reporterId, input);
  },
  async listPostReports(postId: string) {
    const reports = await postsRepo.listPostReports(postId);
    return {
      items: await Promise.all(
        reports.map(async (report) => ({
          id: report.id,
          reason: report.reason,
          createdAt: report.createdAt.toISOString(),
          reporter: {
            id: report.reporter.id,
            displayName: report.reporter.displayName,
            avatarUrl: null,
            role: isValidAuthRole(report.reporter.role) ? report.reporter.role : ("user" as "user" | "admin")
          },
          evidenceImages: (await resolveUploadedFileUrls(parseFileIdArray(report.imageFileIds))).map((url, index) => ({
            id: `${report.id}-${index}`,
            url,
            fileName: `report-${index + 1}.png`,
            mimeType: "image/png",
            byteSize: 0
          }))
        }))
      )
    };
  },
  async listPostCommentReports(commentId: string) {
    const reports = await postsRepo.listCommentReports(commentId);
    return {
      items: await Promise.all(
        reports.map(async (report) => ({
          id: report.id,
          reason: report.reason,
          createdAt: report.createdAt.toISOString(),
          reporter: {
            id: report.reporter.id,
            displayName: report.reporter.displayName,
            avatarUrl: null,
            role: isValidAuthRole(report.reporter.role) ? report.reporter.role : ("user" as "user" | "admin")
          },
          evidenceImages: (await resolveUploadedFileUrls(parseFileIdArray(report.imageFileIds))).map((url, index) => ({
            id: `${report.id}-${index}`,
            url,
            fileName: `report-${index + 1}.png`,
            mimeType: "image/png",
            byteSize: 0
          }))
        }))
      )
    };
  },
  async listAdminComments(status?: PostCommentStatus) {
    const items = await postsRepo.listAdminComments(status);
    return serializeAdminCommentList(items);
  },
  async updateCommentStatus(id: string, status: PostCommentStatus) {
    return postsCommentWriteService.updateCommentStatus(id, status);
  }
};
