import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  patchPostAuthorFollowState,
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
});
