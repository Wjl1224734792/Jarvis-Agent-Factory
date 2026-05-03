import { describe, expect, it } from "vitest";
import {
  estimateTotalCommentsFromPostRoots,
  getVisibleRootComments,
  shouldShowCommentCollapseToggle
} from "../src/features/posts/comment-collapse-helpers";

describe("comment collapse helpers", () => {
  const roots = ["a", "b", "c", "d"];

  it("getVisibleRootComments: no limit returns a copy of full list", () => {
    const visible = getVisibleRootComments(roots, undefined, false);
    expect(visible).toEqual(roots);
    expect(visible).not.toBe(roots);
  });

  it("getVisibleRootComments: limit <= 0 behaves like no collapse", () => {
    expect(getVisibleRootComments(roots, 0, false)).toEqual(roots);
    expect(getVisibleRootComments(roots, -1, false)).toEqual(roots);
  });

  it("getVisibleRootComments: expanded ignores limit", () => {
    expect(getVisibleRootComments(roots, 2, true)).toEqual(roots);
  });

  it("getVisibleRootComments: collapsed slices to limit", () => {
    expect(getVisibleRootComments(roots, 3, false)).toEqual(["a", "b", "c"]);
  });

  it("shouldShowCommentCollapseToggle: false when no limit or not enough roots", () => {
    expect(shouldShowCommentCollapseToggle(10, undefined)).toBe(false);
    expect(shouldShowCommentCollapseToggle(3, 3)).toBe(false);
    expect(shouldShowCommentCollapseToggle(2, 3)).toBe(false);
  });

  it("shouldShowCommentCollapseToggle: true when roots exceed limit", () => {
    expect(shouldShowCommentCollapseToggle(4, 3)).toBe(true);
  });

  it("estimateTotalCommentsFromPostRoots: sums roots and one-level replies", () => {
    expect(estimateTotalCommentsFromPostRoots([])).toBe(0);
    expect(estimateTotalCommentsFromPostRoots([{ replies: [] }, { replies: [{}] }])).toBe(3);
  });
});
