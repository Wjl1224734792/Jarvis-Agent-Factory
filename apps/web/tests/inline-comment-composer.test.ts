import { describe, expect, it } from "vitest";
import { resolveInlineCommentComposerState } from "../src/features/posts/inline-comment-composer-state";

describe("inline comment composer state", () => {
  it("keeps the input editable when submit is blocked by validation", () => {
    expect(
      resolveInlineCommentComposerState({
        value: "",
        disabled: true,
        inputDisabled: false,
        busy: false
      })
    ).toEqual({
      inputDisabled: false,
      submitDisabled: true
    });
  });

  it("disables both input and submit while busy", () => {
    expect(
      resolveInlineCommentComposerState({
        value: "comment",
        disabled: false,
        inputDisabled: false,
        busy: true
      })
    ).toEqual({
      inputDisabled: true,
      submitDisabled: true
    });
  });

  it("disables submit when content is blank even if input stays editable", () => {
    expect(
      resolveInlineCommentComposerState({
        value: "   ",
        disabled: false,
        inputDisabled: false,
        busy: false
      })
    ).toEqual({
      inputDisabled: false,
      submitDisabled: true
    });
  });
});
