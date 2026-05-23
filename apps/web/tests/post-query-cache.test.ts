import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  patchPostAuthorFollowState,
  patchPostCommentCreated,
  patchPostCommentDeleted,
  patchPostCommentLikeToggle,
  patchPostInteractionState,
  patchPostViewCount
} from "../src/features/posts/post-query-cache";

function createInfiniteFeedData(postId: string, authorId: string) {
  return {
    pages: [
      {
        items: [
          {
            id: postId,
            author: { id: authorId },
            engagement: {
              likeCount: 12,
              favoriteCount: 3,
              shareCount: 2,
              viewer: {
                isFollowingAuthor: false,
                hasLiked: false,
                hasFavorited: false,
                hasShared: false
              }
            },
            commentCount: 4,
            viewCount: 20
          }
        ],
        nextCursor: "cursor_2",
        hasMore: true
      },
      {
        items: [
          {
            id: `${postId}_2`,
            author: { id: `${authorId}_2` },
            engagement: {
              likeCount: 8,
              favoriteCount: 1,
              shareCount: 0,
              viewer: {
                isFollowingAuthor: false,
                hasLiked: false,
                hasFavorited: false,
                hasShared: false
              }
            },
            commentCount: 1,
            viewCount: 7
          }
        ],
        nextCursor: null,
        hasMore: false
      }
    ],
    pageParams: [undefined, "cursor_2"]
  };
}

/** 创建帖子详情缓存数据（含评论） */
function createPostDetailData(
  postId: string,
  authorId: string,
  overrides?: {
    likeCount?: number;
    favoriteCount?: number;
    shareCount?: number;
    commentCount?: number;
    comments?: Array<Record<string, unknown>>;
  }
) {
  return {
    item: {
      id: postId,
      author: { id: authorId },
      engagement: {
        likeCount: overrides?.likeCount ?? 12,
        favoriteCount: overrides?.favoriteCount ?? 3,
        shareCount: overrides?.shareCount ?? 2,
        viewer: {
          isFollowingAuthor: false,
          hasLiked: false,
          hasFavorited: false,
          hasShared: false
        }
      },
      commentCount: overrides?.commentCount ?? 4,
      viewCount: 20,
      comments: overrides?.comments ?? [
        {
          id: "comment_1",
          parentCommentId: null,
          replyToCommentId: null,
          status: "visible",
          likeCount: 2,
          reportCount: 0,
          content: "好帖子",
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
          author: { id: "user_2" },
          replyToUser: null,
          viewer: { canEdit: false, canDelete: false, hasLiked: false, hasReported: false },
          replyCount: 1,
          replies: [
            {
              id: "reply_1",
              parentCommentId: "comment_1",
              replyToCommentId: "comment_1",
              status: "visible",
              likeCount: 0,
              reportCount: 0,
              content: "同意",
              createdAt: "2025-01-02T00:00:00Z",
              updatedAt: "2025-01-02T00:00:00Z",
              author: { id: "user_3" },
              replyToUser: { displayName: "用户2" },
              viewer: { canEdit: false, canDelete: false, hasLiked: false, hasReported: false }
            }
          ]
        }
      ]
    }
  };
}

describe("post-query-cache", () => {
  it("patches view counts across infinite home and circle feeds without changing cursors", () => {
    const queryClient = new QueryClient();
    const homeFeed = createInfiniteFeedData("post_1", "author_1");
    const circleFeed = createInfiniteFeedData("post_1", "author_1");

    queryClient.setQueryData(["home-shell-feed", "latest", null], homeFeed);
    queryClient.setQueryData(["circle-feed", "latest"], circleFeed);

    patchPostViewCount(queryClient, "post_1", 2);

    expect(queryClient.getQueryData(["home-shell-feed", "latest", null])).toEqual({
      pages: [
        {
          items: [
            {
              ...homeFeed.pages[0].items[0],
              viewCount: 22
            }
          ],
          nextCursor: "cursor_2",
          hasMore: true
        },
        homeFeed.pages[1]
      ],
      pageParams: [undefined, "cursor_2"]
    });
    expect(queryClient.getQueryData(["circle-feed", "latest"])).toEqual({
      pages: [
        {
          items: [
            {
              ...circleFeed.pages[0].items[0],
              viewCount: 22
            }
          ],
          nextCursor: "cursor_2",
          hasMore: true
        },
        circleFeed.pages[1]
      ],
      pageParams: [undefined, "cursor_2"]
    });
  });

  it("patches author follow state across infinite feed pages in place", () => {
    const queryClient = new QueryClient();
    const homeFeed = createInfiniteFeedData("post_1", "author_1");

    queryClient.setQueryData(["home-shell-feed", "following", null], homeFeed);

    patchPostAuthorFollowState(queryClient, "author_1", true);

    expect(queryClient.getQueryData(["home-shell-feed", "following", null])).toEqual({
      pages: [
        {
          items: [
            {
              ...homeFeed.pages[0].items[0],
              engagement: {
                ...homeFeed.pages[0].items[0].engagement,
                viewer: {
                  ...homeFeed.pages[0].items[0].engagement.viewer,
                  isFollowingAuthor: true
                }
              }
            }
          ],
          nextCursor: "cursor_2",
          hasMore: true
        },
        homeFeed.pages[1]
      ],
      pageParams: [undefined, "cursor_2"]
    });
  });

  it("patchPostInteractionState: 点赞乐观更新同步到 feed 和详情", () => {
    const queryClient = new QueryClient();
    const homeFeed = createInfiniteFeedData("post_1", "author_1");
    const circleFeed = createInfiniteFeedData("post_1", "author_1");
    const detail = createPostDetailData("post_1", "author_1");

    queryClient.setQueryData(["home-shell-feed", "latest", null], homeFeed);
    queryClient.setQueryData(["circle-feed", "latest"], circleFeed);
    queryClient.setQueryData(["post-detail", "post_1"], detail);

    patchPostInteractionState(queryClient, {
      postId: "post_1",
      likeDelta: 1,
      viewerPatch: { hasLiked: true }
    });

    // home feed 已更新
    const homeData = queryClient.getQueryData<any>(["home-shell-feed", "latest", null]);
    expect(homeData.pages[0].items[0].engagement.likeCount).toBe(13);
    expect(homeData.pages[0].items[0].engagement.viewer.hasLiked).toBe(true);

    // circle feed 已更新
    const circleData = queryClient.getQueryData<any>(["circle-feed", "latest"]);
    expect(circleData.pages[0].items[0].engagement.likeCount).toBe(13);
    expect(circleData.pages[0].items[0].engagement.viewer.hasLiked).toBe(true);

    // 详情已更新
    const detailData = queryClient.getQueryData<any>(["post-detail", "post_1"]);
    expect(detailData.item.engagement.likeCount).toBe(13);
    expect(detailData.item.engagement.viewer.hasLiked).toBe(true);
  });

  it("patchPostInteractionState: 取消收藏时计数正确递减", () => {
    const queryClient = new QueryClient();
    const detail = createPostDetailData("post_1", "author_1", { favoriteCount: 5 });

    queryClient.setQueryData(["post-detail", "post_1"], detail);

    patchPostInteractionState(queryClient, {
      postId: "post_1",
      favoriteDelta: -1,
      viewerPatch: { hasFavorited: false }
    });

    const detailData = queryClient.getQueryData<any>(["post-detail", "post_1"]);
    expect(detailData.item.engagement.favoriteCount).toBe(4);
    expect(detailData.item.engagement.viewer.hasFavorited).toBe(false);
  });

  it("patchPostInteractionState: 计数不会降到负数", () => {
    const queryClient = new QueryClient();
    const detail = createPostDetailData("post_1", "author_1", { likeCount: 0 });

    queryClient.setQueryData(["post-detail", "post_1"], detail);

    patchPostInteractionState(queryClient, {
      postId: "post_1",
      likeDelta: -1,
      viewerPatch: { hasLiked: false }
    });

    const detailData = queryClient.getQueryData<any>(["post-detail", "post_1"]);
    expect(detailData.item.engagement.likeCount).toBe(0);
  });

  it("patchPostCommentCreated: 新评论追加到详情并递增 commentCount", () => {
    const queryClient = new QueryClient();
    const homeFeed = createInfiniteFeedData("post_1", "author_1");
    const detail = createPostDetailData("post_1", "author_1", { commentCount: 4 });

    queryClient.setQueryData(["home-shell-feed", "latest", null], homeFeed);
    queryClient.setQueryData(["post-detail", "post_1"], detail);

    const newComment = {
      id: "new_comment",
      parentCommentId: null,
      replyToCommentId: null,
      status: "visible" as const,
      likeCount: 0,
      reportCount: 0,
      content: "新评论内容",
      createdAt: "2025-06-01T00:00:00Z",
      updatedAt: "2025-06-01T00:00:00Z",
      author: { id: "user_99" },
      replyToUser: null,
      viewer: { canEdit: true, canDelete: true, hasLiked: false, hasReported: false }
    };

    patchPostCommentCreated(queryClient, "post_1", newComment);

    // feed commentCount +1
    const homeData = queryClient.getQueryData<any>(["home-shell-feed", "latest", null]);
    expect(homeData.pages[0].items[0].commentCount).toBe(5);

    // 详情 commentCount +1 且评论列表追加
    const detailData = queryClient.getQueryData<any>(["post-detail", "post_1"]);
    expect(detailData.item.commentCount).toBe(5);
    expect(detailData.item.comments).toHaveLength(2);
    expect(detailData.item.comments[1].id).toBe("new_comment");
    expect(detailData.item.comments[1].replyCount).toBe(0);
    expect(detailData.item.comments[1].replies).toEqual([]);
  });

  it("patchPostCommentCreated: 待审核评论不增加 commentCount", () => {
    const queryClient = new QueryClient();
    const detail = createPostDetailData("post_1", "author_1", { commentCount: 4 });

    queryClient.setQueryData(["post-detail", "post_1"], detail);

    const pendingComment = {
      id: "pending_comment",
      parentCommentId: null,
      replyToCommentId: null,
      status: "pending" as const,
      likeCount: 0,
      reportCount: 0,
      content: "待审核评论",
      createdAt: "2025-06-01T00:00:00Z",
      updatedAt: "2025-06-01T00:00:00Z",
      author: { id: "user_99" },
      replyToUser: null,
      viewer: { canEdit: true, canDelete: true, hasLiked: false, hasReported: false }
    };

    patchPostCommentCreated(queryClient, "post_1", pendingComment);

    const detailData = queryClient.getQueryData<any>(["post-detail", "post_1"]);
    expect(detailData.item.commentCount).toBe(4);
    expect(detailData.item.comments).toHaveLength(2);
  });

  it("patchPostCommentCreated: 回复追加到父线程 replies", () => {
    const queryClient = new QueryClient();
    const detail = createPostDetailData("post_1", "author_1", { commentCount: 4 });

    queryClient.setQueryData(["post-detail", "post_1"], detail);

    const reply = {
      id: "new_reply",
      parentCommentId: "comment_1",
      replyToCommentId: "comment_1",
      status: "visible" as const,
      likeCount: 0,
      reportCount: 0,
      content: "回复内容",
      createdAt: "2025-06-02T00:00:00Z",
      updatedAt: "2025-06-02T00:00:00Z",
      author: { id: "user_99" },
      replyToUser: { displayName: "用户2" },
      viewer: { canEdit: true, canDelete: true, hasLiked: false, hasReported: false }
    };

    patchPostCommentCreated(queryClient, "post_1", reply);

    const detailData = queryClient.getQueryData<any>(["post-detail", "post_1"]);
    expect(detailData.item.commentCount).toBe(5);
    const thread = detailData.item.comments[0];
    expect(thread.replyCount).toBe(2);
    expect(thread.replies).toHaveLength(2);
    expect(thread.replies[1].id).toBe("new_reply");
  });

  it("patchPostCommentDeleted: 删除评论并递减 commentCount", () => {
    const queryClient = new QueryClient();
    const homeFeed = createInfiniteFeedData("post_1", "author_1");
    const detail = createPostDetailData("post_1", "author_1", { commentCount: 4 });

    queryClient.setQueryData(["home-shell-feed", "latest", null], homeFeed);
    queryClient.setQueryData(["post-detail", "post_1"], detail);

    // 删除 visible 顶级评论（1 条 visible + 1 条 visible reply = 2）
    patchPostCommentDeleted(queryClient, "post_1", "comment_1", 2);

    // feed commentCount: 4 - 2 = 2
    const homeData = queryClient.getQueryData<any>(["home-shell-feed", "latest", null]);
    expect(homeData.pages[0].items[0].commentCount).toBe(2);

    // detail commentCount: 4 - 2 = 2
    const detailData = queryClient.getQueryData<any>(["post-detail", "post_1"]);
    expect(detailData.item.commentCount).toBe(2);
    expect(detailData.item.comments).toHaveLength(0);
  });

  it("patchPostCommentLikeToggle: 评论点赞切换同步到详情", () => {
    const queryClient = new QueryClient();
    const detail = createPostDetailData("post_1", "author_1");

    queryClient.setQueryData(["post-detail", "post_1"], detail);

    // 点赞 comment_1
    patchPostCommentLikeToggle(queryClient, "post_1", "comment_1", true);

    let detailData = queryClient.getQueryData<any>(["post-detail", "post_1"]);
    expect(detailData.item.comments[0].likeCount).toBe(3);
    expect(detailData.item.comments[0].viewer.hasLiked).toBe(true);

    // 取消点赞 comment_1
    patchPostCommentLikeToggle(queryClient, "post_1", "comment_1", false);

    detailData = queryClient.getQueryData<any>(["post-detail", "post_1"]);
    expect(detailData.item.comments[0].likeCount).toBe(2);
    expect(detailData.item.comments[0].viewer.hasLiked).toBe(false);
  });

  it("patchPostCommentLikeToggle: 回复点赞同步到详情", () => {
    const queryClient = new QueryClient();
    const detail = createPostDetailData("post_1", "author_1");

    queryClient.setQueryData(["post-detail", "post_1"], detail);

    patchPostCommentLikeToggle(queryClient, "post_1", "reply_1", true);

    const detailData = queryClient.getQueryData<any>(["post-detail", "post_1"]);
    expect(detailData.item.comments[0].replies[0].likeCount).toBe(1);
    expect(detailData.item.comments[0].replies[0].viewer.hasLiked).toBe(true);
  });
});
