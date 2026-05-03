import { describe, expect, it } from "vitest";
import {
  buildCommentAuditManualDecision,
  buildAdminCommentQueryKey,
  countPendingAdminComments,
  isAdminCommentTargetMatch,
  sortAdminCommentsWithTargetFirst,
  shouldEnableAdminCommentQuery,
  type AdminCommentStatus,
  type CommentDomain
} from "../src/features/posts/post-comments-page-helpers";

describe("post comments page helpers", () => {
  it("only enables the active comment domain query", () => {
    const activeDomain: CommentDomain = "ranking";

    expect(shouldEnableAdminCommentQuery(activeDomain, "ranking")).toBe(true);
    expect(shouldEnableAdminCommentQuery(activeDomain, "post")).toBe(false);
    expect(shouldEnableAdminCommentQuery(activeDomain, "review")).toBe(false);
    expect(shouldEnableAdminCommentQuery(activeDomain, "model")).toBe(false);
    expect(shouldEnableAdminCommentQuery(activeDomain, "rating-target")).toBe(false);
  });

  it("builds query keys with domain and status", () => {
    const status: AdminCommentStatus = "pending";

    expect(buildAdminCommentQueryKey("post", status)).toEqual([
      "admin-comments",
      "post",
      "pending"
    ]);
    expect(buildAdminCommentQueryKey("rating-target", "all")).toEqual([
      "admin-comments",
      "rating-target",
      "all"
    ]);
  });

  it("counts only pending comments from the current domain items", () => {
    expect(
      countPendingAdminComments([
        { status: "pending" },
        { status: "visible" },
        { status: "pending" },
        { status: "hidden" }
      ])
    ).toBe(2);
  });

  it("matches target comments by exact id instead of suffix", () => {
    expect(isAdminCommentTargetMatch("comment-12", "comment-12")).toBe(true);
    expect(isAdminCommentTargetMatch("comment-12", "12")).toBe(false);
    expect(isAdminCommentTargetMatch("comment-12", null)).toBe(false);
  });

  it("sorts the targeted comment to the top while keeping other items in place", () => {
    expect(
      sortAdminCommentsWithTargetFirst(
        [{ id: "comment-1" }, { id: "comment-2" }, { id: "comment-3" }],
        "comment-2"
      )
    ).toEqual([{ id: "comment-2" }, { id: "comment-1" }, { id: "comment-3" }]);
  });

  it("builds manual audit decisions for comment visibility toggles", () => {
    expect(buildCommentAuditManualDecision("comment-1", "visible")).toEqual({
      domain: "comment",
      entityId: "comment-1",
      status: "manual_passed",
      reviewNote: null
    });
    expect(buildCommentAuditManualDecision("comment-1", "hidden")).toEqual({
      domain: "comment",
      entityId: "comment-1",
      status: "manual_rejected",
      reviewNote: "管理员已在评论审核页隐藏该评论。"
    });
  });
});
