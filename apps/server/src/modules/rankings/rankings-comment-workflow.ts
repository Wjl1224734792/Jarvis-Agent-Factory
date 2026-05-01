import { evaluateTextModeration } from '../audits/text-moderation.service';
import { socialService } from '../social/social.service';
import { siteSettingsService } from '../site-settings/site-settings.service';
import { usersService } from '../users/users.service';
import { serializeRankingComment } from './rankings-presenters';
import { rankingsRepo } from './rankings.repo';

type CommentModerationAction = 'approve' | 'manual_review' | 'reject';
type PersistedCommentStatus = 'pending' | 'visible' | 'hidden';
type RankingCommentRecord = Awaited<
  ReturnType<typeof rankingsRepo.listRankingComments>
>[number];

const COMMENT_STATUS_BY_ACTION = {
  approve: 'visible',
  manual_review: 'pending',
  reject: 'hidden'
} satisfies Record<CommentModerationAction, PersistedCommentStatus>;
const PERSISTED_COMMENT_STATUSES = new Set<PersistedCommentStatus>([
  'pending',
  'visible',
  'hidden'
]);

interface RankingCommentTarget {
  rankingId: string;
  rankingTitle: string;
  rankingAuthorId: string;
}

interface RankingCommentViewer {
  id: string;
  role: 'user' | 'admin';
}

interface RatingTargetCommentTarget {
  id: string;
  authorId: string;
  title: string;
}

export interface RatingTargetParentComment {
  id: string;
  parentCommentId: string | null;
  author: { id: string };
}

interface BuildRatingTargetReplyContextInput {
  itemAuthorId: string;
  itemTitle: string;
  parentComment?: RatingTargetParentComment | null;
}

export interface RatingTargetReplyContext {
  parentCommentId: string | null;
  replyToCommentId: string | null;
  replyToUserId: string | null;
  targetUserId: string;
  notificationType: 'post_commented' | 'comment_replied';
  notificationTitle: string;
  notificationSummary: string;
}

interface CreateRankingCommentInput extends RankingCommentTarget {
  currentUserId: string;
  content: string;
}

interface SubmitRatingTargetReviewInput {
  item: RatingTargetCommentTarget;
  currentUserId: string;
  rating: number;
  content: string;
}

interface CreateRatingTargetCommentInput {
  item: RatingTargetCommentTarget;
  currentUserId: string;
  content: string;
  rating: number | null;
  parentComment?: RatingTargetParentComment | null;
}

interface UpdateRatingTargetCommentInput {
  commentId: string;
  content: string;
  previousStatus: PersistedCommentStatus;
}

/**
 * 将审核动作映射为评论持久化状态，避免 service 层重复展开分支。
 *
 * @param action 文本审核服务返回的动作。
 * @returns `pending`、`visible` 或 `hidden` 之一。
 * @throws {never} 所有合法动作都在映射表中穷举覆盖。
 */
export function resolveCommentStatusFromModerationAction(
  action: CommentModerationAction
): PersistedCommentStatus {
  return COMMENT_STATUS_BY_ACTION[action];
}

/**
 * 收敛 repo 返回的宽泛状态字符串，避免上层传播未约束的 `string`。
 *
 * @param status repo 或外部来源返回的原始状态值。
 * @param fallback 状态不合法时回退到的默认值。
 * @returns 受限的评论持久化状态。
 * @throws {never} 非法状态仅回退，不主动抛错。
 */
export function normalizePersistedCommentStatus(
  status: string | null | undefined,
  fallback: PersistedCommentStatus = 'pending'
): PersistedCommentStatus {
  return status && PERSISTED_COMMENT_STATUSES.has(status as PersistedCommentStatus)
    ? (status as PersistedCommentStatus)
    : fallback;
}

/**
 * 归一化榜单条目评论的回复上下文，保持单层回复树与通知目标一致。
 *
 * @param input 条目作者、标题与可选父评论信息。
 * @returns 可直接写入 repo 的回复链字段，以及后续通知所需目标信息。
 * @throws {never} 缺少父评论时自动回退为顶层评论上下文。
 */
export function buildRatingTargetReplyContext(
  input: BuildRatingTargetReplyContextInput
): RatingTargetReplyContext {
  if (!input.parentComment) {
    return {
      parentCommentId: null,
      replyToCommentId: null,
      replyToUserId: null,
      targetUserId: input.itemAuthorId,
      notificationType: 'post_commented',
      notificationTitle: '榜单条目收到新评论',
      notificationSummary: `有人评论了你的榜单条目《${input.itemTitle}》`
    };
  }

  return {
    parentCommentId: input.parentComment.parentCommentId ?? input.parentComment.id,
    replyToCommentId: input.parentComment.id,
    replyToUserId: input.parentComment.author.id,
    targetUserId: input.parentComment.author.id,
    notificationType: 'comment_replied',
    notificationTitle: '榜单条目评论收到回复',
    notificationSummary: `有人回复了你在《${input.itemTitle}》下的评论`
  };
}

async function resolveModeratedCommentStatus(
  commentId: string,
  content: string
): Promise<PersistedCommentStatus> {
  const moderation = await evaluateTextModeration({
    mode: await siteSettingsService.getCommentModerationMode(),
    domain: 'comment',
    entityId: commentId,
    text: content
  });

  return resolveCommentStatusFromModerationAction(moderation.action);
}

async function moderateRankingComment(
  item: RankingCommentRecord,
  content: string
): Promise<RankingCommentRecord> {
  const nextStatus = await resolveModeratedCommentStatus(item.id, content);
  if (nextStatus === 'pending') {
    return item;
  }

  const moderated = await rankingsRepo.updateRankingCommentStatus(item.id, nextStatus);
  return moderated ?? item;
}

async function moderateRatingTargetComment(
  commentId: string,
  content: string
): Promise<PersistedCommentStatus> {
  const nextStatus = await resolveModeratedCommentStatus(commentId, content);
  if (nextStatus === 'pending') {
    return nextStatus;
  }

  const moderated = await rankingsRepo.updateRatingTargetCommentStatus(
    commentId,
    nextStatus
  );

  return normalizePersistedCommentStatus(moderated?.status, nextStatus);
}

async function serializeRankingCommentForViewer(
  item: RankingCommentRecord,
  currentUserId: string
) {
  const viewer: RankingCommentViewer = {
    id: currentUserId,
    role: 'user'
  };
  const ipLocationLabelMap = await usersService.resolvePublicIpLocationLabelMap([
    item.author.id
  ]);

  return serializeRankingComment(item, viewer, ipLocationLabelMap);
}

async function notifyVisibleRankingComment(input: {
  status: PersistedCommentStatus;
  actorId: string;
  commentId: string;
  target: RankingCommentTarget;
}) {
  if (input.status !== 'visible') {
    return;
  }

  if (input.target.rankingAuthorId === input.actorId) {
    return;
  }

  await socialService.recordNotification({
    userId: input.target.rankingAuthorId,
    actorId: input.actorId,
    type: 'post_commented',
    commentId: input.commentId,
    target: {
      type: 'ranking',
      id: input.target.rankingId,
      title: input.target.rankingTitle,
      href: `/rankings/${input.target.rankingId}`
    },
    title: '榜单收到新评论',
    summary: `有人评论了你的榜单《${input.target.rankingTitle}》`
  });
}

async function notifyVisibleRatingTargetComment(input: {
  status: PersistedCommentStatus;
  actorId: string;
  commentId: string;
  ratingTargetId: string;
  ratingTargetTitle: string;
  targetUserId: string;
  notificationType: 'post_commented' | 'comment_replied';
  notificationTitle: string;
  notificationSummary: string;
}) {
  if (input.status !== 'visible') {
    return;
  }

  if (input.targetUserId === input.actorId) {
    return;
  }

  await socialService.recordNotification({
    userId: input.targetUserId,
    actorId: input.actorId,
    type: input.notificationType,
    commentId: input.commentId,
    target: {
      type: 'rating_target',
      id: input.ratingTargetId,
      title: input.ratingTargetTitle,
      href: `/rating-targets/${input.ratingTargetId}`
    },
    title: input.notificationTitle,
    summary: input.notificationSummary
  });
}

/**
 * 创建榜单评论写流程，集中承接评论审核、状态推进与通知副作用。
 *
 * @returns 可供 `rankings.service.ts` 复用的评论写操作集合。
 * @throws {Error} 当 repo、审核服务或通知服务失败时透传异常。
 */
export function createRankingsCommentWorkflow() {
  return {
    async createRankingComment(input: CreateRankingCommentInput) {
      const created = await rankingsRepo.createRankingComment({
        rankingId: input.rankingId,
        authorId: input.currentUserId,
        content: input.content,
        status: 'pending'
      });
      if (!created) {
        return null;
      }

      const currentItem = await moderateRankingComment(created, input.content);
      const currentStatus = normalizePersistedCommentStatus(currentItem.status);
      await notifyVisibleRankingComment({
        status: currentStatus,
        actorId: input.currentUserId,
        commentId: created.id,
        target: {
          rankingId: input.rankingId,
          rankingTitle: input.rankingTitle,
          rankingAuthorId: input.rankingAuthorId
        }
      });

      return {
        item: await serializeRankingCommentForViewer(currentItem, input.currentUserId)
      };
    },
    async submitRatingTargetReview(input: SubmitRatingTargetReviewInput) {
      const reviewComment = await rankingsRepo.upsertRatingTargetReview({
        ratingTargetId: input.item.id,
        authorId: input.currentUserId,
        rating: input.rating,
        content: input.content,
        status: 'pending'
      });
      if (!reviewComment) {
        return false;
      }

      const replyContext = buildRatingTargetReplyContext({
        itemAuthorId: input.item.authorId,
        itemTitle: input.item.title
      });
      const status = await moderateRatingTargetComment(
        reviewComment.id,
        input.content
      );

      await notifyVisibleRatingTargetComment({
        status,
        actorId: input.currentUserId,
        commentId: reviewComment.id,
        ratingTargetId: input.item.id,
        ratingTargetTitle: input.item.title,
        targetUserId: replyContext.targetUserId,
        notificationType: replyContext.notificationType,
        notificationTitle: replyContext.notificationTitle,
        notificationSummary: replyContext.notificationSummary
      });

      return true;
    },
    async createRatingTargetComment(input: CreateRatingTargetCommentInput) {
      const replyContext = buildRatingTargetReplyContext({
        itemAuthorId: input.item.authorId,
        itemTitle: input.item.title,
        parentComment: input.parentComment ?? null
      });

      if (input.rating !== null) {
        await rankingsRepo.upsertRatingTargetRating({
          ratingTargetId: input.item.id,
          userId: input.currentUserId,
          rating: input.rating
        });
      }

      const created = await rankingsRepo.createRatingTargetComment({
        ratingTargetId: input.item.id,
        authorId: input.currentUserId,
        parentCommentId: replyContext.parentCommentId,
        replyToCommentId: replyContext.replyToCommentId,
        replyToUserId: replyContext.replyToUserId,
        content: input.content,
        rating: input.rating,
        status: 'pending'
      });
      if (!created) {
        return null;
      }

      const status = await moderateRatingTargetComment(created.id, input.content);
      await notifyVisibleRatingTargetComment({
        status,
        actorId: input.currentUserId,
        commentId: created.id,
        ratingTargetId: input.item.id,
        ratingTargetTitle: input.item.title,
        targetUserId: replyContext.targetUserId,
        notificationType: replyContext.notificationType,
        notificationTitle: replyContext.notificationTitle,
        notificationSummary: replyContext.notificationSummary
      });

      return { commentId: created.id };
    },
    async updateRatingTargetComment(input: UpdateRatingTargetCommentInput) {
      const updated = await rankingsRepo.updateRatingTargetComment(
        input.commentId,
        input.content
      );
      if (!updated) {
        return false;
      }

      if (input.previousStatus === 'visible') {
        await rankingsRepo.updateRatingTargetCommentStatus(input.commentId, 'pending');
      }

      await moderateRatingTargetComment(input.commentId, input.content);
      return true;
    }
  };
}
