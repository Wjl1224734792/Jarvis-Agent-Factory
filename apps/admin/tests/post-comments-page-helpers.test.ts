import { describe, expect, it } from "vitest";
import {
  buildAdminCommentQueryKey,
  countPendingAdminComments,
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
});
