import { isValidAuthRole, isValidRankingCommentStatus } from '../../lib/type-guards';
import { usersService } from '../users/users.service';
import { resolveUploadedFileUrl } from '../uploads/uploads.helpers';
import type { rankingsRepo } from './rankings.repo';

type RankingCommentStatus = 'pending' | 'visible' | 'hidden';

type AdminRankingCommentItem = Awaited<
  ReturnType<typeof rankingsRepo.listAdminRankingComments>
>[number];
type AdminRankingCommentStatusItem = NonNullable<
  Awaited<ReturnType<typeof rankingsRepo.updateRankingCommentStatus>>
>;
type AdminRatingTargetCommentItem = Awaited<
  ReturnType<typeof rankingsRepo.listAdminRatingTargetComments>
>[number];
type AdminRatingTargetCommentStatusItem = NonNullable<
  Awaited<ReturnType<typeof rankingsRepo.updateRatingTargetCommentStatus>>
>;

async function serializeAdminCommentAuthor(
  author: {
    id: string;
    displayName: string;
    avatarFileId?: string | null;
    role: string;
  },
  ipLocationLabelMap: ReadonlyMap<string, string | null>
) {
  return {
    id: author.id,
    displayName: author.displayName,
    avatarUrl: await resolveUploadedFileUrl(author.avatarFileId ?? null),
    ipLocationLabel: ipLocationLabelMap.get(author.id) ?? null,
    role: isValidAuthRole(author.role) ? author.role : ('user' as const)
  };
}

async function serializeAdminReplyToUser(
  user:
    | {
        id: string;
        displayName: string;
        avatarFileId?: string | null;
        role: string;
      }
    | null
    | undefined,
  ipLocationLabelMap: ReadonlyMap<string, string | null>
) {
  if (!user?.id) {
    return null;
  }

  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: await resolveUploadedFileUrl(user.avatarFileId ?? null),
    ipLocationLabel: ipLocationLabelMap.get(user.id) ?? null,
    role: isValidAuthRole(user.role) ? user.role : ('user' as const)
  };
}

function normalizeRankingCommentStatus(status: string) {
  return isValidRankingCommentStatus(status)
    ? status
    : ('visible' satisfies RankingCommentStatus);
}

/**
 * 序列化后台榜单评论列表。
 *
 * @param items 后台榜单评论记录。
 * @returns 面向后台列表页的榜单评论响应。
 * @throws {Error} 当头像或 IP 属地查询失败时透传异常。
 */
export async function serializeAdminRankingCommentList(
  items: AdminRankingCommentItem[]
) {
  const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap(
    items.map(item => item.author.id)
  );

  return {
    items: await Promise.all(
      items.map(async item => ({
        id: item.id,
        rankingId: item.rankingId,
        rankingTitle: item.rankingTitle,
        content: item.content,
        status: normalizeRankingCommentStatus(item.status),
        likeCount: item.likeCount ?? 0,
        reportCount: item.reportCount ?? 0,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        author: await serializeAdminCommentAuthor(
          item.author,
          ipLocationLabelMap
        ),
        viewer: {
          canEdit: false,
          canDelete: false,
          hasLiked: false,
          hasReported: false
        }
      }))
    )
  };
}

/**
 * 序列化后台单条榜单评论状态更新结果。
 *
 * @param item 状态更新后的榜单评论记录。
 * @returns 面向后台的单条榜单评论响应。
 * @throws {Error} 当头像或 IP 属地查询失败时透传异常。
 */
export async function serializeAdminRankingCommentStatusItem(
  item: AdminRankingCommentStatusItem
) {
  const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap([
    item.author.id
  ]);

  return {
    id: item.id,
    rankingId: item.rankingId,
    rankingTitle: item.rankingTitle,
    content: item.content,
    status: normalizeRankingCommentStatus(item.status),
    likeCount: item.likeCount ?? 0,
    reportCount: item.reportCount ?? 0,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    author: await serializeAdminCommentAuthor(item.author, ipLocationLabelMap),
    viewer: {
      canEdit: false,
      canDelete: false,
      hasLiked: false,
      hasReported: false
    }
  };
}

/**
 * 序列化后台评分对象评论列表。
 *
 * @param items 后台评分对象评论记录。
 * @returns 面向后台列表页的评分对象评论响应。
 * @throws {Error} 当头像或 IP 属地查询失败时透传异常。
 */
export async function serializeAdminRatingTargetCommentList(
  items: AdminRatingTargetCommentItem[]
) {
  const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap([
    ...items.map(item => item.author.id),
    ...items
      .map(item => item.replyToUser?.id)
      .filter((value): value is string => Boolean(value))
  ]);

  return {
    items: await Promise.all(
      items.map(async item => ({
        id: item.id,
        ratingTargetId: item.ratingTargetId,
        ratingTargetTitle: item.ratingTargetTitle,
        rankingTitle: item.rankingTitle,
        parentCommentId: item.parentCommentId,
        replyToCommentId: item.replyToCommentId,
        content: item.content,
        status: normalizeRankingCommentStatus(item.status),
        rating: item.rating ?? null,
        likeCount: item.likeCount ?? 0,
        reportCount: item.reportCount ?? 0,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        author: await serializeAdminCommentAuthor(
          item.author,
          ipLocationLabelMap
        ),
        replyToUser: await serializeAdminReplyToUser(
          item.replyToUser,
          ipLocationLabelMap
        ),
        viewer: {
          canEdit: false,
          canDelete: false,
          hasLiked: false,
          hasReported: false
        }
      }))
    )
  };
}

/**
 * 序列化后台单条评分对象评论状态更新结果。
 *
 * @param item 状态更新后的评分对象评论记录。
 * @returns 面向后台的单条评分对象评论响应。
 * @throws {Error} 当头像或 IP 属地查询失败时透传异常。
 */
export async function serializeAdminRatingTargetCommentStatusItem(
  item: AdminRatingTargetCommentStatusItem
) {
  const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap([
    item.author.id,
    ...(item.replyToUser?.id ? [item.replyToUser.id] : [])
  ]);

  return {
    id: item.id,
    ratingTargetId: item.ratingTargetId,
    ratingTargetTitle: item.ratingTargetTitle,
    rankingTitle: item.rankingTitle,
    parentCommentId: item.parentCommentId,
    replyToCommentId: item.replyToCommentId,
    content: item.content,
    status: normalizeRankingCommentStatus(item.status),
    rating: item.rating ?? null,
    likeCount: item.likeCount ?? 0,
    reportCount: item.reportCount ?? 0,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    author: await serializeAdminCommentAuthor(item.author, ipLocationLabelMap),
    replyToUser: await serializeAdminReplyToUser(
      item.replyToUser,
      ipLocationLabelMap
    ),
    viewer: {
      canEdit: false,
      canDelete: false,
      hasLiked: false,
      hasReported: false
    }
  };
}
