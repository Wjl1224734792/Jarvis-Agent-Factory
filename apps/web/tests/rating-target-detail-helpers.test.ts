import { describe, expect, it } from "vitest";
import {
  buildRatingTargetSubmission,
  canSubmitRatingTargetComment,
  patchRatingTargetCommentCreated,
  patchRatingTargetCommentLike,
  patchRatingTargetCommentReport
} from "../src/routes/rating-target-detail-helpers";

type MockComment = {
  id: string;
  parentCommentId: string | null;
  status: "pending" | "visible" | "hidden";
  rating: number | null;
  likeCount: number;
  reportCount: number;
  viewer: { hasLiked: boolean; hasReported: boolean };
  replies: MockComment[];
};

type MockDetail = {
  commentCount: number;
  comments: MockComment[];
};

describe("rating target detail helpers", () => {
  it("returns null when no rating is selected", () => {
    expect(buildRatingTargetSubmission(0, "some text")).toBeNull();
  });

  it("routes to rating-only submission when content is empty", () => {
    expect(buildRatingTargetSubmission(4, "   ")).toEqual({
      kind: "rating",
      payload: {
        rating: 4
      }
    });
  });

  it("routes to review submission when content is present", () => {
    expect(buildRatingTargetSubmission(5, " Strong field result. ")).toEqual({
      kind: "review",
      payload: {
        rating: 5,
        content: "Strong field result."
      }
    });
  });

  it("allows replies without rating but still blocks empty content", () => {
    expect(
      canSubmitRatingTargetComment({
        rating: 0,
        content: "  reply content  ",
        isReplying: true
      })
    ).toBe(true);
    expect(
      canSubmitRatingTargetComment({
        rating: 0,
        content: "   ",
        isReplying: true
      })
    ).toBe(false);
  });

  it("requires rating for top-level comments", () => {
    expect(
      canSubmitRatingTargetComment({
        rating: 0,
        content: "top level comment",
        isReplying: false
      })
    ).toBe(false);
    expect(
      canSubmitRatingTargetComment({
        rating: 4,
        content: "top level comment",
        isReplying: false
      })
    ).toBe(true);
  });

  it("patches comment likes without rebuilding unrelated counts", () => {
    const detail: MockDetail = {
      commentCount: 2,
      comments: [
        {
          id: "root_1",
          parentCommentId: null,
          status: "visible" as const,
          rating: 5,
          likeCount: 1,
          reportCount: 0,
          viewer: { hasLiked: false, hasReported: false },
          replies: []
        }
      ]
    };

    expect(patchRatingTargetCommentLike(detail, "root_1", true).comments[0]?.likeCount).toBe(2);
    expect(patchRatingTargetCommentLike(detail, "root_1", true).commentCount).toBe(2);
  });

  it("patches comment reports in place", () => {
    const detail: MockDetail = {
      commentCount: 1,
      comments: [
        {
          id: "root_1",
          parentCommentId: null,
          status: "visible" as const,
          rating: 4,
          likeCount: 0,
          reportCount: 0,
          viewer: { hasLiked: false, hasReported: false },
          replies: []
        }
      ]
    };

    const patched = patchRatingTargetCommentReport(detail, "root_1");
    expect(patched.comments[0]?.reportCount).toBe(1);
    expect(patched.comments[0]?.viewer.hasReported).toBe(true);
  });

  it("appends visible replies and increments visible comment count", () => {
    const detail: MockDetail = {
      commentCount: 1,
      comments: [
        {
          id: "root_1",
          parentCommentId: null,
          status: "visible" as const,
          rating: 5,
          likeCount: 0,
          reportCount: 0,
          viewer: { hasLiked: false, hasReported: false },
          replies: []
        }
      ]
    };

    const patched = patchRatingTargetCommentCreated(detail, {
      id: "reply_1",
      parentCommentId: "root_1",
      status: "visible" as const,
      rating: null,
      likeCount: 0,
      reportCount: 0,
      viewer: { hasLiked: false, hasReported: false },
      replies: []
    });

    expect(patched.commentCount).toBe(2);
    expect(patched.comments[0]?.replies).toHaveLength(1);
  });
});
