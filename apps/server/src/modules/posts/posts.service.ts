import { contentCategoriesService } from "../content-categories/content-categories.service";
import { socialService } from "../social/social.service";
import { postsRepo } from "./posts.repo";

type CurrentUser = {
  id: string;
  role: "user" | "admin";
};

type FeedTab = "recommended" | "latest" | "following";
type PostStatus = "pending" | "published" | "rejected" | "hidden";
type PostType = "article" | "moment";
type PostCommentStatus = "visible" | "hidden";
type PostInteractionType = "like" | "favorite" | "share";

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

  return {
    id: image.id,
    url: image.url,
    fileName: image.fileName,
    mimeType: image.mimeType,
    byteSize: image.byteSize
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
    viewer: ReturnType<typeof toViewerState>;
  }
) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    type: item.type as PostType,
    title: item.title,
    contentPreview: toPreview(item.contentPlainText ?? item.content),
    contentHtml: item.contentHtml,
    status: item.status as PostStatus,
    commentCount: item.commentCount,
    reportCount: item.reportCount,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    publishedAt: toIsoString(item.publishedAt),
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      role: item.author.role as "user" | "admin"
    },
    images: options.images,
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

function buildReplyToUserMap(
  users: Awaited<ReturnType<typeof postsRepo.listUsersByIds>>
) {
  return new Map(
    users.map((user) => [
      user.id,
      {
        id: user.id,
        displayName: user.displayName,
        role: user.role as "user" | "admin"
      }
    ])
  );
}

function serializeCommentThreads(
  comments: Awaited<ReturnType<typeof postsRepo.listVisibleComments>>,
  replyToUserMap: Map<string, { id: string; displayName: string; role: "user" | "admin" }>
) {
  const repliesByRootId = new Map<string, Array<any>>();
  const roots: Array<any> = [];

  for (const comment of comments) {
    const serializedBase = {
      id: comment.id,
      postId: comment.postId,
      parentCommentId: comment.parentCommentId,
      replyToCommentId: comment.replyToCommentId,
      content: comment.content,
      status: comment.status as PostCommentStatus,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: {
        id: comment.author.id,
        displayName: comment.author.displayName,
        role: comment.author.role as "user" | "admin"
      },
      replyToUser: comment.replyToUserId ? replyToUserMap.get(comment.replyToUserId) ?? null : null
    };

    if (!comment.parentCommentId) {
      roots.push({
        ...serializedBase,
        replyCount: 0,
        replies: []
      });
      continue;
    }

    const bucket = repliesByRootId.get(comment.parentCommentId) ?? [];
    bucket.push(serializedBase);
    repliesByRootId.set(comment.parentCommentId, bucket);
  }

  return roots.map((root) => ({
    ...root,
    replies: repliesByRootId.get(root.id) ?? [],
    replyCount: (repliesByRootId.get(root.id) ?? []).length
  }));
}

function serializeSingleComment(
  item: Awaited<ReturnType<typeof postsRepo.getCommentById>>,
  replyToUserMap: Map<string, { id: string; displayName: string; role: "user" | "admin" }>
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
    status: item.status as PostCommentStatus,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      role: item.author.role as "user" | "admin"
    },
    replyToUser: item.replyToUserId ? replyToUserMap.get(item.replyToUserId) ?? null : null
  };
}

export const postsService = {
  async uploadImage(input: {
    ownerId: string;
    fileName: string;
    mimeType: string;
    byteSize: number;
    dataUrl: string;
  }) {
    const item = await postsRepo.createImageUpload(input);
    const serialized = serializeImage(item);
    return serialized ? { item: serialized } : null;
  },
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
    const [images, interactions, followingAuthorIds] = await Promise.all([
      postsRepo.listPostImages(postIds),
      currentUser ? postsRepo.listViewerInteractions(postIds, currentUser.id) : [],
      currentUser ? socialService.listFollowingStateSet(currentUser.id, authorIds) : new Set<string>()
    ]);

    const imagesByPostId = buildImagesByPostId(images);
    const interactionMap = buildInteractionMap(interactions);
    const serializedItems = items
      .map((item) =>
        serializePostListItem(item, {
          images: imagesByPostId.get(item.id) ?? [],
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
    type: PostType;
    title: string;
    content: string;
    contentHtml: string | null;
    imageIds: string[];
    contentCategoryId: string | null;
  }) {
    const uniqueImageIds = Array.from(new Set(input.imageIds));
    const images = await postsRepo.listOwnedUnattachedImages(input.authorId, uniqueImageIds);

    if (images.length !== uniqueImageIds.length) {
      return { kind: "invalid_images" as const };
    }

    if (input.type === "article" && !input.contentCategoryId) {
      return { kind: "invalid_category" as const };
    }

    const item = await postsRepo.createPost({
      authorId: input.authorId,
      type: input.type,
      title: input.title,
      content: input.content,
      contentHtml: input.contentHtml,
      contentPlainText: input.content,
      contentCategoryId: input.type === "article" ? input.contentCategoryId : null,
      imageIds: uniqueImageIds
    });

    if (!item) {
      return { kind: "not_found" as const };
    }

    const attachedImages = await postsRepo.listPostImages([item.id]);
    const serialized = serializePostListItem(item, {
      images: buildImagesByPostId(attachedImages).get(item.id) ?? [],
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
  async getPostDetail(id: string, currentUser?: CurrentUser | null) {
    const item = await postsRepo.getPostById(id);
    if (!item) {
      return null;
    }

    const canInspectUnpublished = currentUser?.role === "admin" || currentUser?.id === item.author.id;
    if (item.status !== "published" && !canInspectUnpublished) {
      return null;
    }

    const [comments, images, interactions, followingAuthorIds] = await Promise.all([
      postsRepo.listVisibleComments(id),
      postsRepo.listPostImages([id]),
      currentUser ? postsRepo.listViewerInteractions([id], currentUser.id) : [],
      currentUser ? socialService.listFollowingStateSet(currentUser.id, [item.author.id]) : new Set<string>()
    ]);
    const replyToUserIds = Array.from(
      new Set(comments.map((comment) => comment.replyToUserId).filter((value): value is string => Boolean(value)))
    );
    const replyToUsers = await postsRepo.listUsersByIds(replyToUserIds);
    const replyToUserMap = buildReplyToUserMap(replyToUsers);
    const interactionMap = buildInteractionMap(interactions);

    return {
      item: {
        id: item.id,
        type: item.type as PostType,
        title: item.title,
        content: item.content,
        contentHtml: item.contentHtml,
        status: item.status as PostStatus,
        commentCount: item.commentCount,
        reportCount: item.reportCount,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        publishedAt: toIsoString(item.publishedAt),
        author: {
          id: item.author.id,
          displayName: item.author.displayName,
          role: item.author.role as "user" | "admin"
        },
        images: buildImagesByPostId(images).get(item.id) ?? [],
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
        comments: serializeCommentThreads(comments, replyToUserMap)
      }
    };
  },
  async listAdminPosts(status?: PostStatus) {
    const items = await postsRepo.listAdminPosts(status);
    const images = await postsRepo.listPostImages(items.map((item) => item.id));
    const imagesByPostId = buildImagesByPostId(images);

    return {
      items: items
        .map((item) =>
          serializePostListItem(item, {
            images: imagesByPostId.get(item.id) ?? [],
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
  async updatePostStatus(id: string, status: PostStatus) {
    const item = await postsRepo.updatePostStatus(id, status);
    if (!item) {
      return null;
    }

    const images = await postsRepo.listPostImages([item.id]);
    return serializePostListItem(item, {
      images: buildImagesByPostId(images).get(item.id) ?? [],
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
      content: input.content
    });
    const replyUsers = replyToUserId ? await postsRepo.listUsersByIds([replyToUserId]) : [];
    const serialized = serializeSingleComment(item, buildReplyToUserMap(replyUsers));

    if (!serialized) {
      return { kind: "not_found" as const };
    }

    if (parentComment) {
      await socialService.recordNotification({
        userId: parentComment.author.id,
        actorId: currentUser.id,
        type: "comment_replied",
        postId,
        commentId: item?.id ?? null
      });
    } else {
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
  async reportPost(postId: string, reporterId: string, reason: string) {
    const post = await postsRepo.getPostById(postId);
    if (!post || post.status !== "published") {
      return { kind: "not_found" as const };
    }

    await postsRepo.createReport({ postId, reporterId, reason });
    return { kind: "ok" as const };
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
        status: item.status as PostCommentStatus,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        author: {
          id: item.author.id,
          displayName: item.author.displayName,
          role: item.author.role as "user" | "admin"
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
      status: item.status as PostCommentStatus,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      author: {
        id: item.author.id,
        displayName: item.author.displayName,
        role: item.author.role as "user" | "admin"
      },
      replyToUser: item.replyToUserId ? buildReplyToUserMap(replyToUsers).get(item.replyToUserId) ?? null : null
    };
  }
};
