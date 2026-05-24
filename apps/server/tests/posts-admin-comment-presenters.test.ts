import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listUsersByIds: vi.fn(),
  resolvePublicIpLocationLabelMap: vi.fn(),
  resolveUploadedFileUrlMap: vi.fn()
}));

vi.mock('../src/modules/posts/posts.repo', () => ({
  postsRepo: {
    listUsersByIds: mocks.listUsersByIds
  }
}));

vi.mock('../src/modules/users/users.service', () => ({
  usersService: {
    resolvePublicIpLocationLabelMap: mocks.resolvePublicIpLocationLabelMap
  }
}));

vi.mock('../src/modules/uploads/uploads.helpers', () => ({
  resolveUploadedFileUrlMap: mocks.resolveUploadedFileUrlMap
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('posts admin comment presenters', () => {
  it('serializes admin comment list items with reply user, fallback status and location labels', async () => {
    mocks.listUsersByIds.mockResolvedValue([
      {
        id: 'user_reply',
        displayName: 'Reply User',
        avatarFileId: null,
        role: 'user'
      }
    ]);
    mocks.resolvePublicIpLocationLabelMap.mockResolvedValue(
      new Map([
        ['user_author', 'Shanghai'],
        ['user_reply', 'Beijing']
      ])
    );
    mocks.resolveUploadedFileUrlMap.mockResolvedValue(new Map());

    const { serializeAdminCommentList } = await import(
      '../src/modules/posts/posts-admin-comment-presenters'
    );
    const payload = await serializeAdminCommentList([
      {
        id: 'comment_1',
        postId: 'post_1',
        postTitle: 'Admin Post',
        parentCommentId: null,
        replyToCommentId: 'comment_root',
        replyToUserId: 'user_reply',
        content: 'Need moderation',
        status: 'unexpected_status',
        reportCount: 0,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T01:00:00.000Z'),
        author: {
          id: 'user_author',
          displayName: 'Author',
          avatarFileId: null,
          role: 'not-a-valid-role'
        }
      }
    ]);

    expect(payload.items[0]).toMatchObject({
      postTitle: 'Admin Post',
      status: 'visible',
      author: {
        id: 'user_author',
        displayName: 'Author',
        ipLocationLabel: 'Shanghai',
        role: 'user'
      },
      replyToUser: {
        id: 'user_reply',
        displayName: 'Reply User',
        ipLocationLabel: 'Beijing',
        role: 'user'
      }
    });
  });

  it('serializes single admin comment status updates with provided post title', async () => {
    mocks.listUsersByIds.mockResolvedValue([]);
    mocks.resolvePublicIpLocationLabelMap.mockResolvedValue(
      new Map([['user_author', 'Hangzhou']])
    );
    mocks.resolveUploadedFileUrlMap.mockResolvedValue(new Map());

    const { serializeAdminCommentStatusItem } = await import(
      '../src/modules/posts/posts-admin-comment-presenters'
    );
    const payload = await serializeAdminCommentStatusItem(
      {
        id: 'comment_2',
        postId: 'post_2',
        authorId: 'user_author',
        parentCommentId: null,
        replyToCommentId: null,
        replyToUserId: null,
        content: 'Updated',
        status: 'hidden',
        likeCount: 0,
        reportCount: 2,
        createdAt: new Date('2026-05-02T00:00:00.000Z'),
        updatedAt: new Date('2026-05-02T01:00:00.000Z'),
        author: {
          id: 'user_author',
          displayName: 'Author',
          avatarFileId: null,
          role: 'admin'
        }
      },
      'Updated Post Title'
    );

    expect(payload).toMatchObject({
      postTitle: 'Updated Post Title',
      status: 'hidden',
      reportCount: 2,
      author: {
        id: 'user_author',
        displayName: 'Author',
        ipLocationLabel: 'Hangzhou',
        role: 'admin'
      },
      replyToUser: null
    });
  });
});
