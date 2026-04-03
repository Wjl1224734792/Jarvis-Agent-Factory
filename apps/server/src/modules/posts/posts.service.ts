import {
  isValidAuthRole,
  isValidPostType,
  isValidPostStatus,
  isValidPostCommentStatus
} from "../../lib/type-guards";
import { contentCategoriesService } from "../content-categories/content-categories.service";
import { siteSettingsService } from "../site-settings/site-settings.service";
import { socialService } from "../social/social.service";
import { uploadsRepo } from "../uploads/upload.repo";
import { resolveUploadedFileUrls } from "../uploads/uploads.helpers";
import { uploadsService } from "../uploads/upload.service";
import { postsRepo } from "./posts.repo";
import { buildReplyToUserMap, buildCommentThreads } from "../../lib/comment-serializer";

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

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toPreview(content: string) {
  return content.length > 160 ? `${content.slice(0, 160)}...` : content;
}

function serializeImage(
  image: Awaited<ReturnType<typeof postsRepo.getImageUploadById>>
) {
  if (!image) {
    return null;
  }

  const serialized = uploadsService.serializeFileItem(image);
  return {
    id: serialized.id,
    url: serialized.url,
    fileName: serialized.fileName,
    mimeType: serialized.mimeType,
    byteSize: serialized.byteSize
  };
}

function serializeVideo(
  video: Awaited<ReturnType<typeof postsRepo.getVideoUploadById>>
) {
  if (!video) {
    return null;
  }

  const serialized = uploadsService.serializeFileItem(video);
  return {
    id: serialized.id,
    url: serialized.url,
    fileName: serialized.fileName,
    mimeType: serialized.mimeType,
    byteSize: serialized.byteSize
  };
}

function buildImagesByPostId(
  images: Awaited<ReturnType<typeof postsRepo.listPostImages>>
) {
  const imagesByPostId = new Map<string, NonNullable<ReturnType<typeof serializeImage>>[]>();

  for (const image of images) {
    if (!image.postId) {
      continue;
    }

    const serialized = serializeImage(image);
    if (!serialized) {
      continue;
    }

    const bucket = imagesByPostId.get(image.postId) ?? [];
    bucket.push(serialized);
    imagesByPostId.set(image.postId, bucket);
  }

  return imagesByPostId;
}

function buildVideosByPostId(
  videos: Awaited<ReturnType<typeof postsRepo.listPostVideos>>
) {
  const videosByPostId = new Map<string, NonNullable<ReturnType<typeof serializeVideo>>[]>();

  for (const video of videos) {
    if (!video.postId) {
      continue;
    }

    const serialized = serializeVideo(video);
    if (!serialized) {
      continue;
    }

    const bucket = videosByPostId.get(video.postId) ?? [];
    bucket.push(serialized);
    videosByPostId.set(video.postId, bucket);
  }

  return videosByPostId;
}

function buildInteractionMap(
  interactions: Awaited<ReturnType<typeof postsRepo.listViewerInteractions>>
) {
  const interactionMap = new Map<string, Set<PostInteractionType>>();

  for (const item of interactions) {
    if (item.type !== "like" && item.type !== "favorite" && item.type !== "share") {
      continue;
    }

    const bucket = interactionMap.get(item.postId) ?? new Set<PostInteractionType>();
    bucket.add(item.type);
    interactionMap.set(item.postId, bucket);
  }

  return interactionMap;
}

function toViewerState(input: {
  authorId: string;
  currentUser?: CurrentUser | null;
  followingAuthorIds?: Set<string>;
  interactionTypes?: Set<PostInteractionType>;
}) {
  const isAuthor = input.currentUser?.id === input.authorId;

  return {
    isAuthor,
    isFollowingAuthor: input.currentUser
      ? input.followingAuthorIds?.has(input.authorId) ?? false
      : false,
    hasLiked: input.interactionTypes?.has("like") ?? false,
    hasFavorited: input.interactionTypes?.has("favorite") ?? false,
    hasShared: input.interactionTypes?.has("share") ?? false
  };
}

function serializePostListItem(
  item: Awaited<ReturnType<typeof postsRepo.getPostById>>,
  options: {
    images: NonNullable<ReturnType<typeof serializeImage>>[];
    videos: NonNullable<ReturnType<typeof serializeVideo>>[];
    viewer: ReturnType<typeof toViewerState>;
  }
) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    type: isValidPostType(item.type) ? item.type : ("article" satisfies PostType),
    title: item.title,
    contentPreview: toPreview(item.contentPlainText ?? item.content),
    contentHtml: item.contentHtml,
    status: isValidPostStatus(item.status) ? item.status : ("pending" satisfies PostStatus),
    commentCount: item.commentCount,
    reportCount: item.reportCount,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    publishedAt: toIsoString(item.publishedAt),
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      role: isValidAuthRole(item.author.role) ? item.author.role : ("user" as "user" | "admin")
    },
    images: options.images,
    videos: options.videos,
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
      viewer: options.viewer
    }
  };
}

type PostComment = Awaited<ReturnType<typeof postsRepo.listCommentsForViewer>>[number];

function serializeCommentBase(
  comment: PostComment,
  replyToUserMap: Map<string, { id: string; displayName: string; role: "user" | "admin" }>,
  input: {
    currentUserId?: string | null;
    likedCommentIds?: Set<string>;
    reportedCommentIds?: Set<string>;
  }
) {
  return {
    id: comment.id,
    postId: comment.postId,
    parentCommentId: comment.parentCommentId,
    replyToCommentId: comment.replyToCommentId,
    content: comment.content,
    status: isValidPostCommentStatus(comment.status) ? comment.status : ("visible" satisfies PostCommentStatus),
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    likeCount: comment.likeCount ?? 0,
    reportCount: comment.reportCount ?? 0,
    author: {
      id: comment.author.id,
      displayName: comment.author.displayName,
      role: isValidAuthRole(comment.author.role) ? comment.author.role : ("user" as "user" | "admin")
    },
    replyToUser: comment.replyToUserId ? replyToUserMap.get(comment.replyToUserId) ?? null : null,
    viewer: {
      canEdit: input.currentUserId === comment.author.id,
      canDelete: input.currentUserId === comment.author.id,
      hasLiked: input.likedCommentIds?.has(comment.id) ?? false,
      hasReported: input.reportedCommentIds?.has(comment.id) ?? false
    }
  };
}

function serializeCommentThreads(
  comments: Awaited<ReturnType<typeof postsRepo.listCommentsForViewer>>,
  replyToUserMap: Map<string, { id: string; displayName: string; role: "user" | "admin" }>,
  input: {
    currentUserId?: string | null;
    likedCommentIds?: Set<string>;
    reportedCommentIds?: Set<string>;
    sort: CommentSort;
  }
) {
  const compare =
    input.sort === "hot"
      ? (left: { likeCount: number; updatedAt: string }, right: { likeCount: number; updatedAt: string }) =>
          right.likeCount - left.likeCount || right.updatedAt.localeCompare(left.updatedAt)
      : (left: { createdAt: string }, right: { createdAt: string }) =>
          right.createdAt.localeCompare(left.createdAt);

  const serialized = comments.map((c) =>
    serializeCommentBase(c, replyToUserMap, {
      currentUserId: input.currentUserId,
      likedCommentIds: input.likedCommentIds,
      reportedCommentIds: input.reportedCommentIds
    })
  );

  return buildCommentThreads(serialized, { compare });
}

function buildCommentStateSet(rows: Array<{ commentId: string }>) {
  return new Set(rows.map((row) => row.commentId));
}

function parseFileIdArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function validateOwnedReportImages(ownerId: string, imageIds: string[]) {
  return uploadsRepo.listOwnedUploadedFiles({
    ownerId,
    fileIds: imageIds,
    mediaKind: "image",
    bizType: "report-image"
  });
}

function serializeSingleComment(
  item: Awaited<ReturnType<typeof postsRepo.getCommentById>>,
  replyToUserMap: Map<string, { id: string; displayName: string; role: "user" | "admin" }>,
  currentUserId?: string | null
) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    postId: item.postId,
    parentCommentId: item.parentCommentId,
    replyToCommentId: item.replyToCommentId,
    content: item.content,
    status: isValidPostCommentStatus(item.status) ? item.status : ("visible" satisfies PostCommentStatus),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    likeCount: item.likeCount ?? 0,
    reportCount: item.reportCount ?? 0,
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      role: isValidAuthRole(item.author.role) ? item.author.role : ("user" as "user" | "admin")
    },
    replyToUser: item.replyToUserId ? replyToUserMap.get(item.replyToUserId) ?? null : null,
    viewer: {
      canEdit: currentUserId === item.author.id,
      canDelete: currentUserId === item.author.id,
      hasLiked: false,
      hasReported: false
    }
  };
}

function isOfficialArticlePost(
  item: Awaited<ReturnType<typeof postsRepo.getPostById>>
) {
  return item?.type === "article" && item.author.role === "admin";
}

export const postsService = {
  async listFeed(
    tab: FeedTab,
    currentUser: CurrentUser | null | undefined,
    input: { type: PostType; contentCategorySlug?: string }
  ) {
    const items = await postsRepo.listFeed({
      tab,
      type: input.type,
      currentUserId: currentUser?.id,
      contentCategorySlug: input.contentCategorySlug
    });
    const postIds = items.map((item) => item.id);
    const authorIds = items.map((item) => item.author.id);
    const [images, videos, interactions, followingAuthorIds] = await Promise.all([
      postsRepo.listPostImages(postIds),
      postsRepo.listPostVideos(postIds),
      currentUser ? postsRepo.listViewerInteractions(postIds, currentUser.id) : [],
      currentUser ? socialService.listFollowingStateSet(currentUser.id, authorIds) : new Set<string>()
    ]);

    const imagesByPostId = buildImagesByPostId(images);
    const videosByPostId = buildVideosByPostId(videos);
    const interactionMap = buildInteractionMap(interactions);
    const serializedItems = items
      .map((item) =>
        serializePostListItem(item, {
          images: imagesByPostId.get(item.id) ?? [],
          videos: videosByPostId.get(item.id) ?? [],
          viewer: toViewerState({
            authorId: item.author.id,
            currentUser,
            followingAuthorIds,
            interactionTypes: interactionMap.get(item.id)
          })
        })
      )
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (input.type === "article") {
      const categories = await contentCategoriesService.listEnabledCategories();
      return {
        tab,
        activeCategorySlug: input.contentCategorySlug ?? categories[0]?.slug ?? null,
        categories,
        items: serializedItems
      };
    }

    return {
      tab,
      items: serializedItems
    };
  },
  async createPost(input: {
    authorId: string;
    authorRole: "user" | "admin";
    type: PostType;
    title: string;
    content: string;
    contentHtml: string | null;
    imageIds: string[];
    videoIds: string[];
    contentCategoryId: string | null;
  }) {
    const uniqueImageIds = Array.from(new Set(input.imageIds));
    const images = await postsRepo.listOwnedUnattachedImages(input.authorId, uniqueImageIds);
    const uniqueVideoIds = Array.from(new Set(input.videoIds));
    const videos = await postsRepo.listOwnedUnattachedVideos(input.authorId, uniqueVideoIds);

    if (images.length !== uniqueImageIds.length) {
      return { kind: "invalid_images" as const };
    }

    if (videos.length !== uniqueVideoIds.length) {
      return { kind: "invalid_videos" as const };
    }

    if (
      input.type === "moment" &&
      ((uniqueImageIds.length > 0 && uniqueVideoIds.length > 0) || uniqueVideoIds.length > 1)
    ) {
      return { kind: "invalid_moment_media" as const };
    }

    if (input.type === "article" && !input.contentCategoryId) {
      return { kind: "invalid_category" as const };
    }

    const shouldAutoPublish = !(await siteSettingsService.shouldModeratePost(input.type));
    const status: PostStatus = shouldAutoPublish ? "published" : "pending";

    const item = await postsRepo.createPost({
      authorId: input.authorId,
      type: input.type,
      title: input.title,
      content: input.content,
      contentHtml: input.contentHtml,
      contentPlainText: input.content,
      contentCategoryId: input.type === "article" ? input.contentCategoryId : null,
      status,
      rejectionReason: null,
      publishedAt: shouldAutoPublish ? new Date() : null,
      imageIds: uniqueImageIds,
      videoIds: uniqueVideoIds
    });

    if (!item) {
      return { kind: "not_found" as const };
    }

    const [attachedImages, attachedVideos] = await Promise.all([
      postsRepo.listPostImages([item.id]),
      postsRepo.listPostVideos([item.id])
    ]);
    const serialized = serializePostListItem(item, {
      images: buildImagesByPostId(attachedImages).get(item.id) ?? [],
      videos: buildVideosByPostId(attachedVideos).get(item.id) ?? [],
      viewer: {
        isAuthor: true,
        isFollowingAuthor: false,
        hasLiked: false,
        hasFavorited: false,
        hasShared: false
      }
    });

    return serialized
      ? {
          kind: "ok" as const,
          item: {
            ...serialized,
            content: item.content,
            comments: []
          }
        }
      : { kind: "not_found" as const };
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
    const replyToUserMap = buildReplyToUserMap(replyToUsers);
    const interactionMap = buildInteractionMap(interactions);
    const likedCommentIds = buildCommentStateSet(likedComments);
    const reportedCommentIds = buildCommentStateSet(reportedComments);

    return {
      item: {
        id: item.id,
        type: isValidPostType(item.type) ? item.type : ("article" satisfies PostType),
        title: item.title,
        content: item.content,
        contentHtml: item.contentHtml,
        status: isValidPostStatus(item.status) ? item.status : ("pending" satisfies PostStatus),
        commentCount: item.commentCount,
        reportCount: item.reportCount,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        publishedAt: toIsoString(item.publishedAt),
        author: {
          id: item.author.id,
          displayName: item.author.displayName,
          role: isValidAuthRole(item.author.role) ? item.author.role : ("user" as "user" | "admin")
        },
        images: buildImagesByPostId(images).get(item.id) ?? [],
        videos: buildVideosByPostId(videos).get(item.id) ?? [],
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
          sort: options?.commentSort ?? "hot"
        })
      }
    };
  },
  async listAdminPosts(status?: PostStatus) {
    const items = await postsRepo.listAdminPosts(status);
    const [images, videos] = await Promise.all([
      postsRepo.listPostImages(items.map((item) => item.id)),
      postsRepo.listPostVideos(items.map((item) => item.id))
    ]);
    const imagesByPostId = buildImagesByPostId(images);
    const videosByPostId = buildVideosByPostId(videos);

    return {
      items: items
        .map((item) =>
          serializePostListItem(item, {
            images: imagesByPostId.get(item.id) ?? [],
            videos: videosByPostId.get(item.id) ?? [],
            viewer: {
              isAuthor: false,
              isFollowingAuthor: false,
              hasLiked: false,
              hasFavorited: false,
              hasShared: false
            }
          })
        )
        .filter((item): item is NonNullable<typeof item> => item !== null)
    };
  },
  async getAdminOfficialArticle(id: string) {
    const item = await postsRepo.getPostById(id);
    if (!isOfficialArticlePost(item)) {
      return null;
    }

    const [images, videos] = await Promise.all([
      postsRepo.listPostImages([item.id]),
      postsRepo.listPostVideos([item.id])
    ]);
    const serialized = serializePostListItem(item, {
      images: buildImagesByPostId(images).get(item.id) ?? [],
      videos: buildVideosByPostId(videos).get(item.id) ?? [],
      viewer: {
        isAuthor: false,
        isFollowingAuthor: false,
        hasLiked: false,
        hasFavorited: false,
        hasShared: false
      }
    });

    if (!serialized) {
      return null;
    }

    return {
      item: {
        ...serialized,
        content: item.content,
        comments: []
      }
    };
  },
  async updateAdminOfficialArticle(
    id: string,
    input: {
      title: string;
      content: string;
      contentHtml: string | null;
      contentCategoryId: string;
      imageIds: string[];
      videoIds: string[];
    }
  ) {
    const existing = await postsRepo.getPostById(id);
    if (!isOfficialArticlePost(existing)) {
      return { kind: "not_found" as const };
    }

    const uniqueImageIds = Array.from(new Set(input.imageIds));
    const uniqueVideoIds = Array.from(new Set(input.videoIds));
    const [images, videos] = await Promise.all([
      postsRepo.listOwnedAttachableImages(existing.author.id, uniqueImageIds, id),
      postsRepo.listOwnedAttachableVideos(existing.author.id, uniqueVideoIds, id)
    ]);

    if (images.length !== uniqueImageIds.length) {
      return { kind: "invalid_images" as const };
    }

    if (videos.length !== uniqueVideoIds.length) {
      return { kind: "invalid_videos" as const };
    }

    const shouldAutoPublish = !(await siteSettingsService.shouldModeratePost("article"));
    const updated = await postsRepo.updatePost({
      id,
      ownerId: existing.author.id,
      title: input.title,
      content: input.content,
      contentHtml: input.contentHtml,
      contentPlainText: input.content,
      contentCategoryId: input.contentCategoryId,
      status: shouldAutoPublish ? "published" : "pending",
      rejectionReason: null,
      imageIds: uniqueImageIds,
      videoIds: uniqueVideoIds
    });
    if (!isOfficialArticlePost(updated)) {
      return { kind: "not_found" as const };
    }

    const payload = await this.getAdminOfficialArticle(updated.id);
    if (!payload) {
      return { kind: "not_found" as const };
    }

    return {
      kind: "ok" as const,
      item: payload.item
    };
  },
  async deleteAdminOfficialArticle(id: string) {
    const existing = await postsRepo.getPostById(id);
    if (!isOfficialArticlePost(existing)) {
      return { kind: "not_found" as const };
    }

    await postsRepo.deletePost(id);
    return { kind: "ok" as const };
  },
  async updatePostStatus(id: string, status: PostStatus, rejectionReason?: string | null) {
    const item = await postsRepo.updatePostStatus(id, status, rejectionReason);
    if (!item) {
      return null;
    }

    const [images, videos] = await Promise.all([
      postsRepo.listPostImages([item.id]),
      postsRepo.listPostVideos([item.id])
    ]);
    return serializePostListItem(item, {
      images: buildImagesByPostId(images).get(item.id) ?? [],
      videos: buildVideosByPostId(videos).get(item.id) ?? [],
      viewer: {
        isAuthor: false,
        isFollowingAuthor: false,
        hasLiked: false,
        hasFavorited: false,
        hasShared: false
      }
    });
  },
  async createComment(
    postId: string,
    currentUser: CurrentUser,
    input: {
      content: string;
      parentCommentId?: string;
    }
  ) {
    const post = await postsRepo.getPostById(postId);
    if (!post || post.status !== "published") {
      return { kind: "not_found" as const };
    }
    const moderation = await siteSettingsService.getResolvedSettings();
    const status: PostCommentStatus = moderation.commentModerationEnabled ? "pending" : "visible";

    let parentComment: Awaited<ReturnType<typeof postsRepo.getCommentById>> | null = null;
    let threadRootId: string | null = null;
    let replyToCommentId: string | null = null;
    let replyToUserId: string | null = null;

    if (input.parentCommentId) {
      parentComment = await postsRepo.getCommentById(input.parentCommentId);
      if (!parentComment || parentComment.postId !== postId || parentComment.status !== "visible") {
        return { kind: "not_found" as const };
      }

      threadRootId = parentComment.parentCommentId ?? parentComment.id;
      replyToCommentId = parentComment.id;
      replyToUserId = parentComment.author.id;
    }

    const item = await postsRepo.createComment({
      postId,
      authorId: currentUser.id,
      parentCommentId: threadRootId,
      replyToCommentId,
      replyToUserId,
      content: input.content,
      status
    });
    const replyUsers = replyToUserId ? await postsRepo.listUsersByIds([replyToUserId]) : [];
    const serialized = serializeSingleComment(
      item,
      buildReplyToUserMap(replyUsers),
      currentUser.id
    );

    if (!serialized) {
      return { kind: "not_found" as const };
    }

    if (status === "visible" && parentComment) {
      await socialService.recordNotification({
        userId: parentComment.author.id,
        actorId: currentUser.id,
        type: "comment_replied",
        postId,
        commentId: item?.id ?? null
      });
    } else if (status === "visible") {
      await socialService.recordNotification({
        userId: post.author.id,
        actorId: currentUser.id,
        type: "post_commented",
        postId,
        commentId: item?.id ?? null
      });
    }

    return {
      kind: "ok" as const,
      item: serialized
    };
  },
  async updateComment(
    postId: string,
    commentId: string,
    currentUser: CurrentUser,
    input: { content: string }
  ) {
    const comment = await postsRepo.getCommentById(commentId);
    if (!comment || comment.postId !== postId) {
      return { kind: "not_found" as const };
    }

    const canEdit = currentUser.role === "admin" || currentUser.id === comment.author.id;
    if (!canEdit) {
      return { kind: "forbidden" as const };
    }

    const shouldModerate = (await siteSettingsService.getResolvedSettings()).commentModerationEnabled;
    const updated = await postsRepo.updateComment(commentId, input.content);
    if (!updated) {
      return { kind: "not_found" as const };
    }

    if (shouldModerate && updated.status === "visible") {
      await postsRepo.updateCommentStatus(commentId, "pending");
    }

    const refreshed = await postsRepo.getCommentById(commentId);
    const replyUsers = refreshed?.replyToUserId
      ? await postsRepo.listUsersByIds([refreshed.replyToUserId])
      : [];
    const serialized = serializeSingleComment(
      refreshed,
      buildReplyToUserMap(replyUsers),
      currentUser.id
    );
    if (!serialized) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, item: serialized };
  },
  async deleteComment(postId: string, commentId: string, currentUser: CurrentUser) {
    const comment = await postsRepo.getCommentById(commentId);
    if (!comment || comment.postId !== postId) {
      return { kind: "not_found" as const };
    }

    const canDelete = currentUser.role === "admin" || currentUser.id === comment.author.id;
    if (!canDelete) {
      return { kind: "forbidden" as const };
    }

    await postsRepo.deleteCommentThread(commentId, postId);
    return { kind: "ok" as const };
  },
  async toggleCommentLike(postId: string, commentId: string, currentUser: CurrentUser) {
    const comment = await postsRepo.getCommentById(commentId);
    if (!comment || comment.postId !== postId || comment.status !== "visible") {
      return { kind: "not_found" as const };
    }

    await postsRepo.toggleCommentLike(commentId, currentUser.id);
    return { kind: "ok" as const };
  },
  async reportComment(
    postId: string,
    commentId: string,
    currentUser: CurrentUser,
    input: { reason: string; imageIds: string[] }
  ) {
    const comment = await postsRepo.getCommentById(commentId);
    if (!comment || comment.postId !== postId || comment.status !== "visible") {
      return { kind: "not_found" as const };
    }

    const evidenceImages = await validateOwnedReportImages(currentUser.id, input.imageIds);
    if (evidenceImages.length !== input.imageIds.length) {
      return { kind: "invalid_images" as const };
    }

    await postsRepo.createCommentReport({
      commentId,
      reporterId: currentUser.id,
      reason: input.reason,
      imageFileIds: JSON.stringify(input.imageIds)
    });
    return { kind: "ok" as const };
  },
  async deletePost(id: string, currentUser: CurrentUser) {
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
  async updatePost(
    id: string,
    currentUser: CurrentUser,
    input: {
      type: PostType;
      title: string;
      content: string;
      contentHtml: string | null;
      contentCategoryId: string | null;
      imageIds: string[];
      videoIds: string[];
    }
  ) {
    const existing = await postsRepo.getPostById(id);
    if (!existing) {
      return { kind: "not_found" as const };
    }

    const canEdit = currentUser.role === "admin" || currentUser.id === existing.author.id;
    if (!canEdit) {
      return { kind: "forbidden" as const };
    }

    const shouldAutoPublish = !(await siteSettingsService.shouldModeratePost(input.type));
    const updated = await postsRepo.updatePost({
      id,
      ownerId: existing.author.id,
      title: input.title,
      content: input.content,
      contentHtml: input.contentHtml,
      contentPlainText: input.content,
      contentCategoryId: input.type === "article" ? input.contentCategoryId : null,
      status: shouldAutoPublish ? "published" : "pending",
      rejectionReason: null,
      imageIds: input.imageIds,
      videoIds: input.videoIds
    });

    if (!updated) {
      return { kind: "not_found" as const };
    }

    const payload = await this.getPostDetail(id, currentUser, { commentSort: "hot" });
    if (!payload) {
      return { kind: "not_found" as const };
    }

    return { kind: "ok" as const, item: payload.item };
  },
  async toggleInteraction(postId: string, currentUser: CurrentUser, type: PostInteractionType) {
    const post = await postsRepo.getPostById(postId);
    if (!post || post.status !== "published") {
      return { kind: "not_found" as const };
    }

    const result = await postsRepo.toggleInteraction({
      postId,
      userId: currentUser.id,
      type
    });

    if (result.active) {
      const notificationType = {
        like: "post_liked",
        favorite: "post_favorited",
        share: "post_shared"
      } satisfies Record<PostInteractionType, "post_liked" | "post_favorited" | "post_shared">;

      await socialService.recordNotification({
        userId: post.author.id,
        actorId: currentUser.id,
        type: notificationType[type],
        postId
      });
    }

    return { kind: "ok" as const };
  },
  async reportPost(postId: string, reporterId: string, input: { reason: string; imageIds: string[] }) {
    const post = await postsRepo.getPostById(postId);
    if (!post || post.status !== "published") {
      return { kind: "not_found" as const };
    }

    const evidenceImages = await validateOwnedReportImages(reporterId, input.imageIds);
    if (evidenceImages.length !== input.imageIds.length) {
      return { kind: "invalid_images" as const };
    }

    await postsRepo.createReport({
      postId,
      reporterId,
      reason: input.reason,
      imageFileIds: JSON.stringify(input.imageIds)
    });
    return { kind: "ok" as const };
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
    const replyToUserIds = Array.from(
      new Set(items.map((item) => item.replyToUserId).filter((value): value is string => Boolean(value)))
    );
    const replyToUserMap = buildReplyToUserMap(await postsRepo.listUsersByIds(replyToUserIds));

    return {
      items: items.map((item) => ({
        id: item.id,
        postId: item.postId,
        postTitle: item.postTitle,
        parentCommentId: item.parentCommentId,
        replyToCommentId: item.replyToCommentId,
        content: item.content,
        status: isValidPostCommentStatus(item.status) ? item.status : ("visible" satisfies PostCommentStatus),
        reportCount: item.reportCount ?? 0,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        author: {
          id: item.author.id,
          displayName: item.author.displayName,
          role: isValidAuthRole(item.author.role) ? item.author.role : ("user" as "user" | "admin")
        },
        replyToUser: item.replyToUserId ? replyToUserMap.get(item.replyToUserId) ?? null : null
      }))
    };
  },
  async updateCommentStatus(id: string, status: PostCommentStatus) {
    const item = await postsRepo.updateCommentStatus(id, status);
    if (!item) {
      return null;
    }

    const post = await postsRepo.getPostById(item.postId);
    const replyToUsers = item.replyToUserId ? await postsRepo.listUsersByIds([item.replyToUserId]) : [];
    return {
      id: item.id,
      postId: item.postId,
      postTitle: post?.title ?? "",
      parentCommentId: item.parentCommentId,
      replyToCommentId: item.replyToCommentId,
      content: item.content,
      status: isValidPostCommentStatus(item.status) ? item.status : ("visible" satisfies PostCommentStatus),
      reportCount: item.reportCount ?? 0,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      author: {
        id: item.author.id,
        displayName: item.author.displayName,
        role: isValidAuthRole(item.author.role) ? item.author.role : ("user" as "user" | "admin")
      },
      replyToUser: item.replyToUserId ? buildReplyToUserMap(replyToUsers).get(item.replyToUserId) ?? null : null
    };
  }
};
