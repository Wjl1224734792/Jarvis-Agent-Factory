import { socialService } from "../social/social.service";
import { postsRepo } from "./posts.repo";

type CurrentUser = {
  id: string;
  role: "user" | "admin";
};

type FeedTab = "recommended" | "latest" | "following";
type PostStatus = "pending" | "published" | "rejected" | "hidden";
type PostCommentStatus = "visible" | "hidden";
type PostInteractionType = "like" | "favorite" | "share";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toPreview(content: string) {
  return content.length > 140 ? `${content.slice(0, 140)}...` : content;
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
    title: item.title,
    contentPreview: toPreview(item.content),
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
    engagement: {
      likeCount: item.likeCount,
      favoriteCount: item.favoriteCount,
      shareCount: item.shareCount,
      viewer: options.viewer
    }
  };
}

function serializeCommentTree(
  comments: Awaited<ReturnType<typeof postsRepo.listVisibleComments>>
) {
  const nodesById = new Map<
    string,
    {
      id: string;
      postId: string;
      parentCommentId: string | null;
      content: string;
      status: PostCommentStatus;
      createdAt: string;
      updatedAt: string;
      author: {
        id: string;
        displayName: string;
        role: "user" | "admin";
      };
      replies: Array<any>;
    }
  >();

  for (const comment of comments) {
    nodesById.set(comment.id, {
      id: comment.id,
      postId: comment.postId,
      parentCommentId: comment.parentCommentId,
      content: comment.content,
      status: comment.status as PostCommentStatus,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: {
        id: comment.author.id,
        displayName: comment.author.displayName,
        role: comment.author.role as "user" | "admin"
      },
      replies: []
    });
  }

  const roots: Array<(typeof nodesById extends Map<any, infer T> ? T : never)> = [];

  for (const comment of comments) {
    const node = nodesById.get(comment.id);

    if (!node) {
      continue;
    }

    const parentNode = comment.parentCommentId
      ? nodesById.get(comment.parentCommentId)
      : null;

    if (parentNode) {
      parentNode.replies.push(node);
      continue;
    }

    roots.push(node);
  }

  return roots;
}

function serializeSingleComment(
  item: Awaited<ReturnType<typeof postsRepo.getCommentById>>
) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    postId: item.postId,
    parentCommentId: item.parentCommentId,
    content: item.content,
    status: item.status as PostCommentStatus,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      role: item.author.role as "user" | "admin"
    },
    replies: []
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

    if (!serialized) {
      return null;
    }

    return {
      item: serialized
    };
  },
  async listFeed(tab: FeedTab, currentUser?: CurrentUser | null) {
    const items = await postsRepo.listFeed(tab, currentUser?.id);
    const postIds = items.map((item) => item.id);
    const authorIds = items.map((item) => item.author.id);
    const [images, interactions, followingAuthorIds] = await Promise.all([
      postsRepo.listPostImages(postIds),
      currentUser ? postsRepo.listViewerInteractions(postIds, currentUser.id) : [],
      currentUser ? socialService.listFollowingStateSet(currentUser.id, authorIds) : new Set<string>()
    ]);

    const imagesByPostId = buildImagesByPostId(images);
    const interactionMap = buildInteractionMap(interactions);

    return {
      tab,
      items: items
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
        .filter((item): item is NonNullable<typeof item> => item !== null)
    };
  },
  async createPost(input: {
    authorId: string;
    title: string;
    content: string;
    imageIds: string[];
  }) {
    const uniqueImageIds = Array.from(new Set(input.imageIds));
    const images = await postsRepo.listOwnedUnattachedImages(input.authorId, uniqueImageIds);

    if (images.length !== uniqueImageIds.length) {
      return { kind: "invalid_images" as const };
    }

    const item = await postsRepo.createPost({
      authorId: input.authorId,
      title: input.title,
      content: input.content,
      imageIds: uniqueImageIds
    });

    if (!item) {
      return { kind: "not_found" as const };
    }

    const attachedImages = await postsRepo.listPostImages([item.id]);

    return {
      kind: "ok" as const,
      item: {
        id: item.id,
        title: item.title,
        content: item.content,
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
        images: buildImagesByPostId(attachedImages).get(item.id) ?? [],
        engagement: {
          likeCount: item.likeCount,
          favoriteCount: item.favoriteCount,
          shareCount: item.shareCount,
          viewer: {
            isAuthor: true,
            isFollowingAuthor: false,
            hasLiked: false,
            hasFavorited: false,
            hasShared: false
          }
        },
        comments: []
      }
    };
  },
  async getPostDetail(id: string, currentUser?: CurrentUser | null) {
    const item = await postsRepo.getPostById(id);

    if (!item) {
      return null;
    }

    const canInspectUnpublished =
      currentUser?.role === "admin" || currentUser?.id === item.author.id;

    if (item.status !== "published" && !canInspectUnpublished) {
      return null;
    }

    const [comments, images, interactions, followingAuthorIds] = await Promise.all([
      postsRepo.listVisibleComments(id),
      postsRepo.listPostImages([id]),
      currentUser ? postsRepo.listViewerInteractions([id], currentUser.id) : [],
      currentUser
        ? socialService.listFollowingStateSet(currentUser.id, [item.author.id])
        : new Set<string>()
    ]);

    const interactionMap = buildInteractionMap(interactions);

    return {
      item: {
        id: item.id,
        title: item.title,
        content: item.content,
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
        comments: serializeCommentTree(comments)
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

    if (input.parentCommentId) {
      parentComment = await postsRepo.getCommentById(input.parentCommentId);

      if (!parentComment || parentComment.postId !== postId || parentComment.status !== "visible") {
        return { kind: "not_found" as const };
      }
    }

    const item = await postsRepo.createComment({
      postId,
      authorId: currentUser.id,
      content: input.content,
      parentCommentId: input.parentCommentId
    });

    const serialized = serializeSingleComment(item);

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

    const canDelete =
      currentUser.role === "admin" || currentUser.id === comment.author.id;

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
  async toggleInteraction(
    postId: string,
    currentUser: CurrentUser,
    type: PostInteractionType
  ) {
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

    await postsRepo.createReport({
      postId,
      reporterId,
      reason
    });

    return { kind: "ok" as const };
  },
  async listAdminComments(status?: PostCommentStatus) {
    const items = await postsRepo.listAdminComments(status);

    return {
      items: items.map((item) => ({
        id: item.id,
        postId: item.postId,
        postTitle: item.postTitle,
        parentCommentId: item.parentCommentId,
        content: item.content,
        status: item.status as PostCommentStatus,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        author: {
          id: item.author.id,
          displayName: item.author.displayName,
          role: item.author.role as "user" | "admin"
        }
      }))
    };
  },
  async updateCommentStatus(id: string, status: PostCommentStatus) {
    const item = await postsRepo.updateCommentStatus(id, status);

    if (!item) {
      return null;
    }

    const post = await postsRepo.getPostById(item.postId);

    return {
      id: item.id,
      postId: item.postId,
      postTitle: post?.title ?? "",
      parentCommentId: item.parentCommentId,
      content: item.content,
      status: item.status as PostCommentStatus,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      author: {
        id: item.author.id,
        displayName: item.author.displayName,
        role: item.author.role as "user" | "admin"
      }
    };
  }
};
