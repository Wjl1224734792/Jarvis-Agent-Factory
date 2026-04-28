import type { RatingTarget } from '@feijia/schemas';
import { powerTypeSchema } from '@feijia/schemas';
import { buildCommentThreads } from '../../lib/comment-serializer';
import { isValidAuthRole, isValidRankingStatus } from '../../lib/type-guards';
import {
  resolvePublicUploadedFileUrl,
  resolveUploadedFileUrl
} from '../uploads/uploads.helpers';
import { canManageRatingTarget } from './ranking-permissions';
import type { rankingsRepo as RankingsRepo } from './rankings.repo';

const RATING_BREAKDOWN_SCORES = [5, 4, 3, 2, 1] as const;

type RatingTargetStatus = 'pending' | 'published' | 'rejected' | 'hidden';
type RankingCommentStatus = 'pending' | 'visible' | 'hidden';
type RatingTargetListItem = Awaited<
  ReturnType<typeof RankingsRepo.listRatingTargets>
>[number];
type RankingCommentItem = Awaited<
  ReturnType<typeof RankingsRepo.listRankingComments>
>[number];
type RatingTargetComment = Awaited<
  ReturnType<typeof RankingsRepo.listRatingTargetComments>
>[number];

interface PresenterCurrentUser {
  id: string;
  role: 'user' | 'admin';
}

interface PublicUserSummarySource {
  id: string;
  displayName: string;
  avatarFileId?: string | null;
  role: string;
}

interface PublicUserSummaryOptions {
  avatarUrlMap?: ReadonlyMap<string, string | null>;
  ipLocationLabelMap?: ReadonlyMap<string, string | null>;
}

interface RatingTargetAggregate {
  totalRatings: number;
  averageRaw: number;
}

interface SerializeRatingTargetOptions {
  currentUser?: PresenterCurrentUser;
  rankingType: 'official' | 'community';
  rankingAuthorId: string;
  reportedItemIds?: Set<string>;
  imageUrlMap?: ReadonlyMap<string, string | null>;
  avatarUrlMap?: ReadonlyMap<string, string | null>;
  ipLocationLabelMap?: ReadonlyMap<string, string | null>;
}

interface RatingBreakdownRow {
  score: number;
  count: number;
}

export interface RatingTargetCommentReplyToUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  ipLocationLabel?: string | null;
  role: 'user' | 'admin';
}

interface BuildRatingTargetCommentThreadsInput {
  comments: Awaited<ReturnType<typeof RankingsRepo.listRatingTargetComments>>;
  currentUser?: PresenterCurrentUser;
  replyToUsers: Map<string, RatingTargetCommentReplyToUser>;
  likedCommentIds: Set<string>;
  reportedCommentIds: Set<string>;
  ipLocationLabelMap?: ReadonlyMap<string, string | null>;
}

/**
 * 构建前台公开用户摘要，保持头像与 IP 属地的既有回退行为。
 *
 * @param user 原始用户记录。
 * @param input 已解析的头像与 IP 属地映射。
 * @returns 面向 rankings 前台接口的作者摘要。
 * @throws {never} 缺失可选字段时自动回退默认值。
 */
export function buildPublicUserSummary(
  user: PublicUserSummarySource,
  input?: PublicUserSummaryOptions
) {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarFileId
      ? input?.avatarUrlMap?.get(user.avatarFileId) ?? null
      : null,
    ipLocationLabel: input?.ipLocationLabelMap?.get(user.id) ?? null,
    role: isValidAuthRole(user.role) ? user.role : ('user' as const)
  };
}

/**
 * 将五分制均分转换为十分制展示分。
 *
 * @param rawAverage 五分制原始均分。
 * @returns 保留一位小数的十分制分数。
 * @throws {never} 非正数会直接回退为 `0`。
 */
export function toTenPointScore(rawAverage: number): number {
  if (rawAverage <= 0) {
    return 0;
  }

  return Number((rawAverage * 2).toFixed(1));
}

/**
 * 计算数组均值并保持既有一位小数舍入规则。
 *
 * @param values 已过滤后的数值集合。
 * @returns 保留一位小数的平均值；空数组返回 `0`。
 * @throws {never} 仅做纯计算，不会主动抛出异常。
 */
export function average(values: readonly number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
  );
}

/**
 * 将评分计数映射展开成固定的 5-1 分序列。
 *
 * @param scoreCountMap 分数到数量的映射。
 * @returns 固定顺序的评分分布数组。
 * @throws {never} 缺失分值时自动补 `0`。
 */
export function buildRatingBreakdown(
  scoreCountMap: ReadonlyMap<number, number>
) {
  return RATING_BREAKDOWN_SCORES.map(score => ({
    score,
    count: scoreCountMap.get(score) ?? 0
  }));
}

/**
 * 将仓储层聚合结果转成前台评分分布。
 *
 * @param rows 仓储层返回的分数统计行。
 * @returns 固定顺序的评分分布数组。
 * @throws {never} 非法计数会按 `0` 处理。
 */
export function buildRatingBreakdownFromRows(rows: RatingBreakdownRow[]) {
  const scoreCountMap = new Map<number, number>(
    rows.map(row => [row.score, Number(row.count ?? 0)])
  );

  return buildRatingBreakdown(scoreCountMap);
}

/**
 * 解析榜单图片 URL，按内部或公开受众维持现有读取策略。
 *
 * @param fileId 上传文件 ID。
 * @param audience 受众类型，默认内部。
 * @returns 已解析的文件 URL 或 `null`。
 * @throws {Error} 当底层文件 URL 解析失败时透传异常。
 */
export async function resolveRankingImage(
  fileId: string | null | undefined,
  audience: 'internal' | 'public' = 'internal'
) {
  return audience === 'public'
    ? resolvePublicUploadedFileUrl(fileId ?? null)
    : resolveUploadedFileUrl(fileId ?? null);
}

/**
 * 序列化榜单条目详情，保持 linked model、评分和 viewer 字段行为不变。
 *
 * @param item 榜单条目原始记录。
 * @param aggregateMap 条目评分聚合映射。
 * @param userRatingMap 当前用户评分映射。
 * @param input 当前 viewer 与已解析资源映射。
 * @returns 面向前台的榜单条目对象。
 * @throws {Error} 当机型 power type 或文件 URL 解析失败时透传异常。
 */
export async function serializeRatingTarget(
  item: RatingTargetListItem,
  aggregateMap: ReadonlyMap<string, RatingTargetAggregate>,
  userRatingMap: ReadonlyMap<string, number | null>,
  input: SerializeRatingTargetOptions
): Promise<RatingTarget> {
  const aggregate = aggregateMap.get(item.id) ?? {
    totalRatings: 0,
    averageRaw: 0
  };
  const hasLinkedModel = Boolean(
    item.linkedModelId &&
      item.linkedModelSlug &&
      item.linkedModelName &&
      item.linkedModelPowerType &&
      item.linkedModelCategoryId &&
      item.linkedModelCategorySlug &&
      item.linkedModelCategoryName &&
      item.linkedModelBrandId &&
      item.linkedModelBrandSlug &&
      item.linkedModelBrandName
  );
  const linkedModel =
    hasLinkedModel &&
    item.linkedModelId &&
    item.linkedModelSlug &&
    item.linkedModelName &&
    item.linkedModelPowerType &&
    item.linkedModelCategoryId &&
    item.linkedModelCategorySlug &&
    item.linkedModelCategoryName &&
    item.linkedModelBrandId &&
    item.linkedModelBrandSlug &&
    item.linkedModelBrandName
      ? {
          id: item.linkedModelId,
          slug: item.linkedModelSlug,
          name: item.linkedModelName,
          summary: item.linkedModelSummary,
          powerType: powerTypeSchema.parse(item.linkedModelPowerType),
          category: {
            id: item.linkedModelCategoryId,
            slug: item.linkedModelCategorySlug,
            name: item.linkedModelCategoryName
          },
          brand: {
            id: item.linkedModelBrandId,
            slug: item.linkedModelBrandSlug,
            name: item.linkedModelBrandName
          }
        }
      : null;

  return {
    id: item.id,
    rankingId: item.rankingId,
    authorId: item.authorId,
    author: buildPublicUserSummary(item.author, {
      avatarUrlMap: input.avatarUrlMap,
      ipLocationLabelMap: input.ipLocationLabelMap
    }),
    status: isValidRankingStatus(item.status)
      ? item.status
      : ('published' satisfies RatingTargetStatus),
    rejectionReason: item.rejectionReason ?? null,
    rank: item.rank,
    title: item.title,
    summary: item.summary,
    imageFileId: item.imageFileId ?? null,
    imageUrl: item.imageFileId
      ? input.imageUrlMap?.get(item.imageFileId) ??
        (await resolveRankingImage(item.imageFileId))
      : null,
    brandName: item.brandName,
    linkedModel,
    averageScore: toTenPointScore(aggregate.averageRaw),
    totalRatings: aggregate.totalRatings,
    commentCount: item.commentCount,
    likeCount: item.likeCount ?? 0,
    reportCount: item.reportCount ?? 0,
    createdAt: item.createdAt.toISOString(),
    myRating: userRatingMap.get(item.id) ?? null,
    viewer: {
      canEdit: canManageRatingTarget({
        currentUser: input.currentUser,
        rankingType: input.rankingType,
        rankingAuthorId: input.rankingAuthorId,
        itemAuthorId: item.authorId
      }),
      canDelete: canManageRatingTarget({
        currentUser: input.currentUser,
        rankingType: input.rankingType,
        rankingAuthorId: input.rankingAuthorId,
        itemAuthorId: item.authorId
      }),
      hasReported: input.reportedItemIds?.has(item.id) ?? false
    }
  };
}

/**
 * 序列化榜单评论，保持作者头像与 viewer 权限的既有规则。
 *
 * @param item 榜单评论记录。
 * @param currentUser 当前 viewer。
 * @param ipLocationLabelMap IP 属地映射。
 * @returns 面向前台的榜单评论对象。
 * @throws {Error} 当公开头像 URL 解析失败时透传异常。
 */
export async function serializeRankingComment(
  item: RankingCommentItem,
  currentUser?: PresenterCurrentUser,
  ipLocationLabelMap?: ReadonlyMap<string, string | null>
) {
  return {
    id: item.id,
    rankingId: item.rankingId,
    content: item.content,
    status: (item.status ?? 'visible') as RankingCommentStatus,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    likeCount: item.likeCount ?? 0,
    reportCount: item.reportCount ?? 0,
    author: {
      id: item.author.id,
      displayName: item.author.displayName,
      avatarUrl: await resolvePublicUploadedFileUrl(item.author.avatarFileId ?? null),
      ipLocationLabel: ipLocationLabelMap?.get(item.author.id) ?? null,
      role: isValidAuthRole(item.author.role) ? item.author.role : ('user' as const)
    },
    viewer: {
      canEdit: Boolean(
        currentUser &&
          (currentUser.role === 'admin' || currentUser.id === item.author.id)
      ),
      canDelete: Boolean(
        currentUser &&
          (currentUser.role === 'admin' || currentUser.id === item.author.id)
      ),
      hasLiked: false,
      hasReported: false
    }
  };
}

/**
 * 序列化评分条目评论基础结构，供评论树组装复用。
 *
 * @param comment 评分条目评论记录。
 * @param replyToUsers 被回复用户映射。
 * @param currentUser 当前 viewer。
 * @param likedCommentIds 当前 viewer 已点赞评论集合。
 * @param reportedCommentIds 当前 viewer 已举报评论集合。
 * @param ipLocationLabelMap IP 属地映射。
 * @returns 单条已序列化评论。
 * @throws {Error} 当公开头像 URL 解析失败时透传异常。
 */
export async function serializeRatingTargetCommentBase(
  comment: RatingTargetComment,
  replyToUsers: Map<string, RatingTargetCommentReplyToUser>,
  currentUser?: PresenterCurrentUser,
  likedCommentIds?: Set<string>,
  reportedCommentIds?: Set<string>,
  ipLocationLabelMap?: ReadonlyMap<string, string | null>
) {
  return {
    id: comment.id,
    ratingTargetId: comment.ratingTargetId,
    parentCommentId: comment.parentCommentId,
    replyToCommentId: comment.replyToCommentId,
    content: comment.content,
    status: (comment.status ?? 'visible') as RankingCommentStatus,
    rating: comment.rating ?? null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    likeCount: comment.likeCount ?? 0,
    reportCount: comment.reportCount ?? 0,
    author: {
      id: comment.author.id,
      displayName: comment.author.displayName,
      avatarUrl: await resolvePublicUploadedFileUrl(
        comment.author.avatarFileId ?? null
      ),
      ipLocationLabel: ipLocationLabelMap?.get(comment.author.id) ?? null,
      role: isValidAuthRole(comment.author.role)
        ? comment.author.role
        : ('user' as const)
    },
    replyToUser: comment.replyToUserId
      ? replyToUsers.get(comment.replyToUserId) ?? null
      : null,
    viewer: {
      canEdit: Boolean(
        currentUser &&
          (currentUser.role === 'admin' || currentUser.id === comment.author.id)
      ),
      canDelete: Boolean(
        currentUser &&
          (currentUser.role === 'admin' || currentUser.id === comment.author.id)
      ),
      hasLiked: likedCommentIds?.has(comment.id) ?? false,
      hasReported: reportedCommentIds?.has(comment.id) ?? false
    }
  };
}

/**
 * 将评分条目评论列表序列化为前台评论树。
 *
 * @param input 评论记录、viewer 状态与回复用户映射。
 * @returns 以热度优先排序的评论树。
 * @throws {Error} 当子评论序列化或头像解析失败时透传异常。
 */
export async function buildRatingTargetCommentThreads(
  input: BuildRatingTargetCommentThreadsInput
) {
  const compare = (
    left: { likeCount: number; updatedAt: string },
    right: { likeCount: number; updatedAt: string }
  ) =>
    right.likeCount - left.likeCount ||
    right.updatedAt.localeCompare(left.updatedAt);

  const serialized = await Promise.all(
    input.comments.map(comment =>
      serializeRatingTargetCommentBase(
        comment,
        input.replyToUsers,
        input.currentUser,
        input.likedCommentIds,
        input.reportedCommentIds,
        input.ipLocationLabelMap
      )
    )
  );

  return buildCommentThreads(serialized, { compare });
}
