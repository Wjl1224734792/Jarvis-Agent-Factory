import { buildReplyToUserMap } from '../../lib/comment-serializer';
import { usersService } from '../users/users.service';
import { socialService } from '../social/social.service';
import { postsRepo } from './posts.repo';
import { serializeSingleComment } from './posts-presenters';

type CommentModerationAction = 'approve' | 'manual_review' | 'reject';

type CommentRecord = Awaited<ReturnType<typeof postsRepo.getCommentById>> | null;
type SerializedComment = NonNullable<
  Awaited<ReturnType<typeof serializeCommentForViewer>>
>;

async function buildCommentReplyContext(
  item: NonNullable<CommentRecord>,
  currentUserId?: string | null
) {
  const replyToUserId = item.replyToUserId ?? null;
  const replyUsers = replyToUserId
    ? await postsRepo.listUsersByIds([replyToUserId])
    : [];
  const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap([
    item.author.id ?? currentUserId ?? '',
    ...(replyToUserId ? [replyToUserId] : [])
  ]);
  const replyToUserMap = buildReplyToUserMap(
    replyUsers.map(replyUser => ({
      ...replyUser,
      ipLocationLabel: ipLocationLabelMap.get(replyUser.id) ?? null
    }))
  );

  return {
    replyToUserMap,
    ipLocationLabelMap
  };
}

/**
 * 将评论记录序列化为 viewer 可消费的详情对象。
 *
 * @param item 评论记录。
 * @param currentUserId 当前 viewer ID。
 * @returns 序列化后的评论；无记录时返回 `null`。
 * @throws {Error} 当用户或评论依赖数据查询失败时透传异常。
 */
export async function serializeCommentForViewer(
  item: CommentRecord,
  currentUserId?: string | null
) {
  if (!item) {
    return null;
  }

  const { replyToUserMap, ipLocationLabelMap } = await buildCommentReplyContext(
    item,
    currentUserId
  );

  return serializeSingleComment(
    item,
    replyToUserMap,
    currentUserId,
    ipLocationLabelMap
  );
}

/**
 * 根据审核结果推进评论状态，并返回最新的序列化评论。
 *
 * @param input 评论 ID、当前 viewer、审核动作与当前序列化结果。
 * @returns 推进后的最新评论；未产生状态迁移时返回当前评论。
 * @throws {Error} 当评论状态更新或回读失败时透传异常。
 */
export async function applyCommentModerationTransition(input: {
  commentId: string;
  currentUserId?: string | null;
  action: CommentModerationAction;
  currentItem: SerializedComment;
}) {
  if (input.action === 'manual_review') {
    return input.currentItem;
  }

  const nextStatus = input.action === 'approve' ? 'visible' : 'hidden';
  const next = await postsRepo.updateCommentStatus(input.commentId, nextStatus);
  const nextSerialized = await serializeCommentForViewer(
    next,
    input.currentUserId
  );

  return nextSerialized ?? input.currentItem;
}

/**
 * 在评论最终可见时补发对应通知。
 *
 * @param input 帖子作者、父评论作者和当前评论信息。
 * @returns 无返回值；评论未可见时静默跳过。
 * @throws {Error} 当通知记录失败时透传异常。
 */
export async function notifyVisibleComment(input: {
  visible: boolean;
  parentCommentAuthorId?: string | null;
  postAuthorId: string;
  actorId: string;
  postId: string;
  commentId: string;
}) {
  if (!input.visible) {
    return;
  }

  if (input.parentCommentAuthorId) {
    await socialService.recordNotification({
      userId: input.parentCommentAuthorId,
      actorId: input.actorId,
      type: 'comment_replied',
      postId: input.postId,
      commentId: input.commentId
    });
    return;
  }

  await socialService.recordNotification({
    userId: input.postAuthorId,
    actorId: input.actorId,
    type: 'post_commented',
    postId: input.postId,
    commentId: input.commentId
  });
}
