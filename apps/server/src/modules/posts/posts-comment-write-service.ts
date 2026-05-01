import { evaluateTextModeration } from '../audits/text-moderation.service';
import { siteSettingsService } from '../site-settings/site-settings.service';
import {
  applyCommentModerationTransition,
  notifyVisibleComment,
  serializeCommentForViewer
} from './posts-comment-workflow';
import { serializeAdminCommentStatusItem } from './posts-admin-comment-presenters';
import { postsRepo } from './posts.repo';

type PostCommentStatus = 'pending' | 'visible' | 'hidden';

interface CurrentUser {
  id: string;
  role: 'user' | 'admin';
}

interface CreateCommentInput {
  content: string;
  parentCommentId?: string;
}

interface UpdateCommentInput {
  content: string;
}

interface ReportCommentInput {
  reason: string;
  imageIds: string[];
}

interface ValidOwnedReportImage {
  id: string;
}

interface PostsCommentWriteServiceDependencies {
  validateOwnedReportImages: (
    ownerId: string,
    imageIds: string[]
  ) => Promise<ValidOwnedReportImage[]>;
}

/**
 * 聚合 posts 域评论写链，复用既有审核流、通知流与后台 presenter，
 * 仅把 `posts.service.ts` 中的评论写操作下沉为可组合服务。
 *
 * @param dependencies 仍由 `posts.service.ts` 持有的共享回调依赖。
 * @returns 供 `posts.service.ts` 透传的评论写入方法集合。
 * @throws {Error} 透传 repo、审核和通知依赖抛出的异常。
 */
export function createPostsCommentWriteService(
  dependencies: PostsCommentWriteServiceDependencies
) {
  async function moderateSerializedComment(input: {
    commentId: string;
    currentUserId: string;
    content: string;
    currentItem: NonNullable<
      Awaited<ReturnType<typeof serializeCommentForViewer>>
    >;
  }) {
    const moderation = await evaluateTextModeration({
      mode: await siteSettingsService.getCommentModerationMode(),
      domain: 'comment',
      entityId: input.commentId,
      text: input.content
    });

    return applyCommentModerationTransition({
      commentId: input.commentId,
      currentUserId: input.currentUserId,
      action: moderation.action,
      currentItem: input.currentItem
    });
  }

  return {
    async createComment(
      postId: string,
      currentUser: CurrentUser,
      input: CreateCommentInput
    ) {
      const post = await postsRepo.getPostById(postId);
      if (!post || post.status !== 'published') {
        return { kind: 'not_found' as const };
      }

      let parentComment: Awaited<ReturnType<typeof postsRepo.getCommentById>> | null =
        null;
      let threadRootId: string | null = null;
      let replyToCommentId: string | null = null;
      let replyToUserId: string | null = null;

      if (input.parentCommentId) {
        parentComment = await postsRepo.getCommentById(input.parentCommentId);
        if (
          !parentComment ||
          parentComment.postId !== postId ||
          parentComment.status !== 'visible'
        ) {
          return { kind: 'not_found' as const };
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
        status: 'pending'
      });
      const serialized = await serializeCommentForViewer(item, currentUser.id);

      if (!serialized) {
        return { kind: 'not_found' as const };
      }

      const currentItem = await moderateSerializedComment({
        commentId: item.id,
        currentUserId: currentUser.id,
        content: input.content,
        currentItem: serialized
      });

      await notifyVisibleComment({
        visible: currentItem.status === 'visible',
        parentCommentAuthorId: parentComment?.author.id ?? null,
        postAuthorId: post.author.id,
        actorId: currentUser.id,
        postId,
        commentId: item.id
      });

      return {
        kind: 'ok' as const,
        item: currentItem
      };
    },
    async updateComment(
      postId: string,
      commentId: string,
      currentUser: CurrentUser,
      input: UpdateCommentInput
    ) {
      const comment = await postsRepo.getCommentById(commentId);
      if (!comment || comment.postId !== postId) {
        return { kind: 'not_found' as const };
      }

      const canEdit =
        currentUser.role === 'admin' || currentUser.id === comment.author.id;
      if (!canEdit) {
        return { kind: 'forbidden' as const };
      }

      const updated = await postsRepo.updateComment(commentId, input.content);
      if (!updated) {
        return { kind: 'not_found' as const };
      }

      if (updated.status === 'visible') {
        await postsRepo.updateCommentStatus(commentId, 'pending');
      }

      const refreshed = await postsRepo.getCommentById(commentId);
      const serialized = await serializeCommentForViewer(
        refreshed,
        currentUser.id
      );
      if (!serialized) {
        return { kind: 'not_found' as const };
      }

      const currentItem = await moderateSerializedComment({
        commentId,
        currentUserId: currentUser.id,
        content: input.content,
        currentItem: serialized
      });

      return { kind: 'ok' as const, item: currentItem };
    },
    async deleteComment(
      postId: string,
      commentId: string,
      currentUser: CurrentUser
    ) {
      const comment = await postsRepo.getCommentById(commentId);
      if (!comment || comment.postId !== postId) {
        return { kind: 'not_found' as const };
      }

      const canDelete =
        currentUser.role === 'admin' || currentUser.id === comment.author.id;
      if (!canDelete) {
        return { kind: 'forbidden' as const };
      }

      await postsRepo.deleteCommentThread(commentId, postId);
      return { kind: 'ok' as const };
    },
    async toggleCommentLike(
      postId: string,
      commentId: string,
      currentUser: CurrentUser
    ) {
      const comment = await postsRepo.getCommentById(commentId);
      if (!comment || comment.postId !== postId || comment.status !== 'visible') {
        return { kind: 'not_found' as const };
      }

      await postsRepo.toggleCommentLike(commentId, currentUser.id);
      return { kind: 'ok' as const };
    },
    async reportComment(
      postId: string,
      commentId: string,
      currentUser: CurrentUser,
      input: ReportCommentInput
    ) {
      const comment = await postsRepo.getCommentById(commentId);
      if (!comment || comment.postId !== postId || comment.status !== 'visible') {
        return { kind: 'not_found' as const };
      }

      const evidenceImages = await dependencies.validateOwnedReportImages(
        currentUser.id,
        input.imageIds
      );
      if (evidenceImages.length !== input.imageIds.length) {
        return { kind: 'invalid_images' as const };
      }

      await postsRepo.createCommentReport({
        commentId,
        reporterId: currentUser.id,
        reason: input.reason,
        imageFileIds: JSON.stringify(input.imageIds)
      });

      return { kind: 'ok' as const };
    },
    async updateCommentStatus(id: string, status: PostCommentStatus) {
      const item = await postsRepo.updateCommentStatus(id, status);
      if (!item) {
        return null;
      }

      const post = await postsRepo.getPostById(item.postId);
      return serializeAdminCommentStatusItem(item, post?.title ?? '');
    }
  };
}
