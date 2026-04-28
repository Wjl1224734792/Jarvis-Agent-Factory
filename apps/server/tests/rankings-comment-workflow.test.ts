import { describe, expect, it } from 'vitest';
import {
  buildRatingTargetReplyContext,
  resolveCommentStatusFromModerationAction
} from '../src/modules/rankings/rankings-comment-workflow';

describe('rankings comment workflow', () => {
  it('maps moderation actions to persisted comment statuses', () => {
    expect(resolveCommentStatusFromModerationAction('approve')).toBe('visible');
    expect(resolveCommentStatusFromModerationAction('manual_review')).toBe(
      'pending'
    );
    expect(resolveCommentStatusFromModerationAction('reject')).toBe('hidden');
  });

  it('builds top-level rating-target comment reply context', () => {
    expect(
      buildRatingTargetReplyContext({
        itemAuthorId: 'user_author',
        itemTitle: 'Sky Cruiser'
      })
    ).toEqual({
      parentCommentId: null,
      replyToCommentId: null,
      replyToUserId: null,
      targetUserId: 'user_author',
      notificationType: 'post_commented',
      notificationTitle: '榜单条目收到新评论',
      notificationSummary: '有人评论了你的榜单条目《Sky Cruiser》'
    });
  });

  it('normalizes reply context to the thread root and direct reply target', () => {
    expect(
      buildRatingTargetReplyContext({
        itemAuthorId: 'user_author',
        itemTitle: 'Sky Cruiser',
        parentComment: {
          id: 'comment_reply',
          parentCommentId: 'comment_root',
          author: { id: 'user_replied' }
        }
      })
    ).toEqual({
      parentCommentId: 'comment_root',
      replyToCommentId: 'comment_reply',
      replyToUserId: 'user_replied',
      targetUserId: 'user_replied',
      notificationType: 'comment_replied',
      notificationTitle: '榜单条目评论收到回复',
      notificationSummary: '有人回复了你在《Sky Cruiser》下的评论'
    });
  });
});
