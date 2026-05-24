import {
  isValidAuthRole,
  isValidPostCommentStatus,
  isValidPostStatus,
  isValidPostType
} from '../../lib/type-guards';
import { buildCommentThreads } from '../../lib/comment-serializer';
import type { postsRepo as PostsRepo } from './posts.repo';

type PostInteractionType = 'like' | 'favorite' | 'share';
type PostStatus = 'pending' | 'published' | 'rejected' | 'hidden';
type PostType = 'article' | 'moment';
type PostCommentStatus = 'pending' | 'visible' | 'hidden';
type CommentSort = 'hot' | 'latest';

interface CurrentUserLike {
  id: string;
  role: 'user' | 'admin';
}

export interface SerializedPostMedia {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
}

export interface ReplyToUserSummary {
  id: string;
  displayName: string;
  ipLocationLabel?: string | null;
  role: 'user' | 'admin';
}

interface PublicUserSummarySource {
  id: string;
  displayName: string;
  avatarFileId?: string | null;
  role: string;
}

interface PostListSerializeOptions {
  cover: SerializedPostMedia | null;
  images: SerializedPostMedia[];
  videos: SerializedPostMedia[];
  viewer: ReturnType<typeof toViewerState>;
  avatarUrlMap?: ReadonlyMap<string, string | null>;
  ipLocationLabelMap?: ReadonlyMap<string, string | null>;
}

interface CommentSerializeOptions {
  currentUserId?: string | null;
  likedCommentIds?: Set<string>;
  reportedCommentIds?: Set<string>;
  avatarUrlMap?: ReadonlyMap<string, string | null>;
  ipLocationLabelMap?: ReadonlyMap<string, string | null>;
}

type PostFeedListItem =
  Awaited<ReturnType<typeof PostsRepo.listFeed>>['items'][number];
type PostLookupItem = NonNullable<
  Awaited<ReturnType<typeof PostsRepo.getPostById>>
>;
type PostListSerializableItem = PostFeedListItem | PostLookupItem;
type PostComment = Awaited<
  ReturnType<typeof PostsRepo.listCommentsForViewer>
>[number];

export function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toPreview(content: string) {
  return content.length > 160 ? `${content.slice(0, 160)}...` : content;
}

/**
 * 按帖子维度构建 viewer 互动类型映射。
 *
 * @param interactions viewer 互动原始数据。
 * @returns `postId -> interaction set` 的映射表。
 * @throws {never} 未识别互动类型会被自动跳过，不会主动抛出异常。
 */
export function buildInteractionMap(
  interactions: Awaited<ReturnType<typeof PostsRepo.listViewerInteractions>>
) {
  const interactionMap = new Map<string, Set<PostInteractionType>>();

  for (const item of interactions) {
    if (
      item.type !== 'like' &&
      item.type !== 'favorite' &&
      item.type !== 'share'
    ) {
      continue;
    }

    const bucket =
      interactionMap.get(item.postId) ?? new Set<PostInteractionType>();
    bucket.add(item.type);
    interactionMap.set(item.postId, bucket);
  }

  return interactionMap;
}

/**
 * 组合帖子作者与当前 viewer 的互动视图状态。
 *
 * @param input 作者、当前用户和互动集合。
 * @returns 面向前端的 viewer 状态对象。
 * @throws {never} 缺失当前用户或互动集合时会自动回退默认值。
 */
export function toViewerState(input: {
  authorId: string;
  currentUser?: CurrentUserLike | null;
  followingAuthorIds?: Set<string>;
  interactionTypes?: Set<PostInteractionType>;
}) {
  const isAuthor = input.currentUser?.id === input.authorId;

  return {
    isAuthor,
    isFollowingAuthor: input.currentUser
      ? input.followingAuthorIds?.has(input.authorId) ?? false
      : false,
    hasLiked: input.interactionTypes?.has('like') ?? false,
    hasFavorited: input.interactionTypes?.has('favorite') ?? false,
    hasShared: input.interactionTypes?.has('share') ?? false
  };
}

export function buildPublicUserSummary(
  user: PublicUserSummarySource,
  options?: {
    avatarUrlMap?: ReadonlyMap<string, string | null>;
    ipLocationLabelMap?: ReadonlyMap<string, string | null>;
  }
) {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarFileId
      ? options?.avatarUrlMap?.get(user.avatarFileId) ?? null
      : null,
    ipLocationLabel: options?.ipLocationLabelMap?.get(user.id) ?? null,
    role: isValidAuthRole(user.role) ? user.role : ('user' as const)
  };
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function serializePostSource(item: {
  sourceLabel?: string | null;
  sourceUrl?: string | null;
}) {
  const label = item.sourceLabel?.trim();
  if (!label) {
    return null;
  }

  const url = item.sourceUrl?.trim();
  return {
    label,
    url: url && isHttpUrl(url) ? url : null
  };
}

const DECLARATION_LABEL_MAP: Record<string, string> = {
  original: '原创',
  ai_generated: 'AI生成',
  ai_assisted: 'AI辅助创作',
  reprinted: '转载',
  deep_synthesis: '深度合成'
};

export function serializePostDeclarations(declaration: string | null | undefined) {
  if (!declaration) {
    return null;
  }
  return {
    value: declaration,
    label: DECLARATION_LABEL_MAP[declaration] ?? declaration
  };
}

/**
 * 序列化帖子列表项。
 *
 * @param item 仓储层返回的帖子记录。
 * @param options 已解析的封面、媒体和 viewer 状态。
 * @returns 面向前端的帖子列表项；无记录时返回 `null`。
 * @throws {never} 缺失可选字段时会自动回退默认值。
 */
export function serializePostListItem(
  item: PostListSerializableItem | null,
  options: PostListSerializeOptions
) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    type: isValidPostType(item.type) ? item.type : ('article' satisfies PostType),
    title: item.title,
    contentPreview: toPreview(item.contentPlainText ?? ''),
    contentHtml: 'contentHtml' in item ? item.contentHtml ?? null : null,
    status: isValidPostStatus(item.status)
      ? item.status
      : ('pending' satisfies PostStatus),
    commentCount: item.commentCount,
    viewCount: item.viewCount ?? 0,
    reportCount: item.reportCount,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    publishedAt: toIsoString(item.publishedAt),
    author: buildPublicUserSummary(item.author, {
      avatarUrlMap: options.avatarUrlMap,
      ipLocationLabelMap: options.ipLocationLabelMap
    }),
    source: serializePostSource(item),
    declaration: serializePostDeclarations(item.declaration),
    cover: options.cover,
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

function serializeCommentBase(
  comment: PostComment,
  replyToUserMap: Map<string, ReplyToUserSummary>,
  input: CommentSerializeOptions
) {
  return {
    id: comment.id,
    postId: comment.postId,
    parentCommentId: comment.parentCommentId,
    replyToCommentId: comment.replyToCommentId,
    content: comment.content,
    status: isValidPostCommentStatus(comment.status)
      ? comment.status
      : ('visible' satisfies PostCommentStatus),
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    likeCount: comment.likeCount ?? 0,
    reportCount: comment.reportCount ?? 0,
    author: buildPublicUserSummary(comment.author, {
      avatarUrlMap: input.avatarUrlMap,
      ipLocationLabelMap: input.ipLocationLabelMap
    }),
    replyToUser: comment.replyToUserId
      ? replyToUserMap.get(comment.replyToUserId) ?? null
      : null,
    viewer: {
      canEdit: input.currentUserId === comment.author.id,
      canDelete: input.currentUserId === comment.author.id,
      hasLiked: input.likedCommentIds?.has(comment.id) ?? false,
      hasReported: input.reportedCommentIds?.has(comment.id) ?? false
    }
  };
}

/**
 * 将评论列表序列化并构造成前端消费的评论树。
 *
 * @param comments 评论仓储记录。
 * @param replyToUserMap 回复对象映射。
 * @param input 当前 viewer 状态与排序模式。
 * @returns 已排好序的评论树。
 * @throws {never} 缺失用户态或统计数据时会自动回退默认值。
 */
export function serializeCommentThreads(
  comments: Awaited<ReturnType<typeof PostsRepo.listCommentsForViewer>>,
  replyToUserMap: Map<string, ReplyToUserSummary>,
  input: CommentSerializeOptions & { sort: CommentSort }
) {
  const compare =
    input.sort === 'hot'
      ? (
          left: { likeCount: number; updatedAt: string },
          right: { likeCount: number; updatedAt: string }
        ) =>
          right.likeCount - left.likeCount ||
          right.updatedAt.localeCompare(left.updatedAt)
      : (left: { createdAt: string }, right: { createdAt: string }) =>
          right.createdAt.localeCompare(left.createdAt);

  const serialized = comments.map(comment =>
    serializeCommentBase(comment, replyToUserMap, input)
  );

  return buildCommentThreads(serialized, { compare });
}

/**
 * 从评论状态查询结果中提取 commentId 集合。
 *
 * @param rows 只包含 `commentId` 的轻量结果集。
 * @returns 评论 ID 的去重集合。
 * @throws {never} 该函数只做映射，不会主动抛出异常。
 */
export function buildCommentStateSet(rows: Array<{ commentId: string }>) {
  return new Set(rows.map(row => row.commentId));
}

/**
 * 解析持久化在字符串字段里的文件 ID 数组。
 *
 * @param value JSON 字符串。
 * @returns 仅包含字符串项的文件 ID 列表；解析失败时返回空数组。
 * @throws {never} 非法 JSON 会自动回退为空数组。
 */
export function parseFileIdArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

/**
 * 序列化单条评论详情。
 *
 * @param item 评论详情记录。
 * @param replyToUserMap 回复对象映射。
 * @param currentUserId 当前 viewer ID。
 * @param ipLocationLabelMap IP 属地映射。
 * @returns 面向前端的评论详情；无记录时返回 `null`。
 * @throws {never} 缺失统计字段时会自动回退默认值。
 */
export function serializeSingleComment(
  item: Awaited<ReturnType<typeof PostsRepo.getCommentById>>,
  replyToUserMap: Map<string, ReplyToUserSummary>,
  currentUserId?: string | null,
  ipLocationLabelMap?: ReadonlyMap<string, string | null>,
  avatarUrlMap?: ReadonlyMap<string, string | null>
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
    status: isValidPostCommentStatus(item.status)
      ? item.status
      : ('visible' satisfies PostCommentStatus),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    likeCount: item.likeCount ?? 0,
    reportCount: item.reportCount ?? 0,
    author: buildPublicUserSummary(item.author, { avatarUrlMap, ipLocationLabelMap }),
    replyToUser: item.replyToUserId
      ? replyToUserMap.get(item.replyToUserId) ?? null
      : null,
    viewer: {
      canEdit: currentUserId === item.author.id,
      canDelete: currentUserId === item.author.id,
      hasLiked: false,
      hasReported: false
    }
  };
}

/**
 * 判断帖子是否属于后台官方文章。
 *
 * @param item 帖子详情记录。
 * @returns 帖子类型为 `article` 且作者为 `admin` 时返回 `true`。
 * @throws {never} 空记录会直接返回 `false`。
 */
export function isOfficialArticlePost(
  item: Awaited<ReturnType<typeof PostsRepo.getPostById>>
) {
  return item?.type === 'article' && item.author.role === 'admin';
}
