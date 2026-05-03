import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolvePublicIpLocationLabelMap: vi.fn(),
  resolveUploadedFileUrl: vi.fn()
}));

vi.mock('../src/modules/users/users.service', () => ({
  usersService: {
    resolvePublicIpLocationLabelMap: mocks.resolvePublicIpLocationLabelMap
  }
}));

vi.mock('../src/modules/uploads/uploads.helpers', () => ({
  resolveUploadedFileUrl: mocks.resolveUploadedFileUrl
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('rankings admin comment presenters', () => {
  it('serializes ranking admin comments with fallback status and author metadata', async () => {
    mocks.resolvePublicIpLocationLabelMap.mockResolvedValue(
      new Map([['user_author', 'Shanghai']])
    );
    mocks.resolveUploadedFileUrl.mockResolvedValue('https://cdn.example.com/avatar.png');

    const { serializeAdminRankingCommentList } = await import(
      '../src/modules/rankings/rankings-admin-comment-presenters'
    );

    const payload = await serializeAdminRankingCommentList([
      {
        id: 'comment_1',
        rankingId: 'ranking_1',
        rankingTitle: 'Top EVTOL',
        content: 'Needs review',
        status: 'unknown_status',
        likeCount: 0,
        reportCount: 0,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T01:00:00.000Z'),
        author: {
          id: 'user_author',
          displayName: 'Author',
          avatarFileId: 'avatar_1',
          role: 'not-a-valid-role'
        }
      }
    ]);

    expect(payload.items[0]).toMatchObject({
      rankingTitle: 'Top EVTOL',
      status: 'visible',
      likeCount: 0,
      reportCount: 0,
      author: {
        id: 'user_author',
        displayName: 'Author',
        avatarUrl: 'https://cdn.example.com/avatar.png',
        ipLocationLabel: 'Shanghai',
        role: 'user'
      },
      viewer: {
        canEdit: false,
        canDelete: false,
        hasLiked: false,
        hasReported: false
      }
    });
  });

  it('serializes rating-target admin comments with reply user metadata', async () => {
    mocks.resolvePublicIpLocationLabelMap.mockResolvedValue(
      new Map([
        ['user_author', 'Hangzhou'],
        ['user_reply', 'Beijing']
      ])
    );
    mocks.resolveUploadedFileUrl.mockImplementation(async fileId =>
      fileId ? `https://cdn.example.com/${fileId}` : null
    );

    const { serializeAdminRatingTargetCommentStatusItem } = await import(
      '../src/modules/rankings/rankings-admin-comment-presenters'
    );

    const payload = await serializeAdminRatingTargetCommentStatusItem({
      id: 'comment_2',
      ratingTargetId: 'target_1',
      ratingTargetTitle: 'Target title',
      rankingTitle: 'Ranking title',
      parentCommentId: null,
      replyToCommentId: 'comment_root',
      content: 'Reply',
      status: 'hidden',
      rating: 4,
      likeCount: 2,
      reportCount: 1,
      createdAt: new Date('2026-05-02T00:00:00.000Z'),
      updatedAt: new Date('2026-05-02T01:00:00.000Z'),
      author: {
        id: 'user_author',
        displayName: 'Author',
        avatarFileId: 'avatar_author',
        role: 'admin'
      },
      replyToUser: {
        id: 'user_reply',
        displayName: 'Reply User',
        avatarFileId: 'avatar_reply',
        role: 'user'
      }
    });

    expect(payload).toMatchObject({
      rankingTitle: 'Ranking title',
      ratingTargetTitle: 'Target title',
      status: 'hidden',
      rating: 4,
      author: {
        id: 'user_author',
        avatarUrl: 'https://cdn.example.com/avatar_author',
        ipLocationLabel: 'Hangzhou',
        role: 'admin'
      },
      replyToUser: {
        id: 'user_reply',
        avatarUrl: 'https://cdn.example.com/avatar_reply',
        ipLocationLabel: 'Beijing',
        role: 'user'
      }
    });
  });
});
