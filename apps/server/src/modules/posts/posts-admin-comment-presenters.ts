import { buildReplyToUserMap } from '../../lib/comment-serializer';
import { isValidPostCommentStatus } from '../../lib/type-guards';
import { resolveUploadedFileUrlMap } from '../uploads/uploads.helpers';
import { usersService } from '../users/users.service';
import { postsRepo } from './posts.repo';
import { buildPublicUserSummary } from './posts-presenters';

type PostCommentStatus = 'pending' | 'visible' | 'hidden';

type AdminCommentListItem = Awaited<
  ReturnType<typeof postsRepo.listAdminComments>
>[number];
type AdminCommentStatusItem = NonNullable<
  Awaited<ReturnType<typeof postsRepo.updateCommentStatus>>
>;

async function buildAdminCommentContext(
  items: Array<{
    author: { id: string; avatarFileId?: string | null };
    replyToUserId: string | null;
  }>
) {
  const replyToUserIds = Array.from(
    new Set(
      items
        .map(item => item.replyToUserId)
        .filter((value): value is string => Boolean(value))
    )
  );
  const [ipLocationLabelMap, replyToUsers, avatarUrlMap] = await Promise.all([
    usersService.resolvePublicIpLocationLabelMap([
      ...items.map(item => item.author.id),
      ...replyToUserIds
    ]),
    postsRepo.listUsersByIds(replyToUserIds),
    resolveUploadedFileUrlMap([
      ...items.map(item => item.author.avatarFileId ?? null),
      ...replyToUserIds
    ])
  ]);
  const replyToUserMap = buildReplyToUserMap(
    replyToUsers.map(replyUser => ({
      ...replyUser,
      ipLocationLabel: ipLocationLabelMap.get(replyUser.id) ?? null
    }))
  );

  return {
    ipLocationLabelMap,
    replyToUserMap,
    avatarUrlMap
  };
}

function serializeAdminCommentItem(
  item: {
    id: string;
    postId: string;
    parentCommentId: string | null;
    replyToCommentId: string | null;
    replyToUserId: string | null;
    content: string;
    status: string;
    reportCount: number | null;
    createdAt: Date;
    updatedAt: Date;
    author: {
      id: string;
      displayName: string;
      role: string;
    };
  },
  input: {
    postTitle: string;
    ipLocationLabelMap: ReadonlyMap<string, string | null>;
    replyToUserMap: ReturnType<typeof buildReplyToUserMap>;
    avatarUrlMap?: ReadonlyMap<string, string | null>;
  }
) {
  return {
    id: item.id,
    postId: item.postId,
    postTitle: input.postTitle,
    parentCommentId: item.parentCommentId,
    replyToCommentId: item.replyToCommentId,
    content: item.content,
    status: isValidPostCommentStatus(item.status)
      ? item.status
      : ('visible' satisfies PostCommentStatus),
    reportCount: item.reportCount ?? 0,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    author: buildPublicUserSummary(item.author, {
      avatarUrlMap: input.avatarUrlMap,
      ipLocationLabelMap: input.ipLocationLabelMap
    }),
    replyToUser: item.replyToUserId
      ? input.replyToUserMap.get(item.replyToUserId) ?? null
      : null
  };
}

/**
 * 序列化后台评论列表。
 *
 * @param items 后台评论列表记录。
 * @returns 可直接返回给后台列表页的评论响应。
 * @throws {Error} 当用户映射或 IP 属地数据查询失败时透传异常。
 */
export async function serializeAdminCommentList(items: AdminCommentListItem[]) {
  const { ipLocationLabelMap, replyToUserMap, avatarUrlMap } =
    await buildAdminCommentContext(items);

  return {
    items: items.map(item =>
      serializeAdminCommentItem(item, {
        postTitle: item.postTitle,
        ipLocationLabelMap,
        replyToUserMap,
        avatarUrlMap
      })
    )
  };
}

/**
 * 序列化后台单条评论状态更新结果。
 *
 * @param item 更新后的评论记录。
 * @param postTitle 对应帖子标题。
 * @returns 面向后台的单条评论响应。
 * @throws {Error} 当用户映射或 IP 属地数据查询失败时透传异常。
 */
export async function serializeAdminCommentStatusItem(
  item: AdminCommentStatusItem,
  postTitle: string
) {
  const { ipLocationLabelMap, replyToUserMap, avatarUrlMap } =
    await buildAdminCommentContext([item]);

  return serializeAdminCommentItem(item, {
    postTitle,
    ipLocationLabelMap,
    replyToUserMap,
    avatarUrlMap
  });
}
