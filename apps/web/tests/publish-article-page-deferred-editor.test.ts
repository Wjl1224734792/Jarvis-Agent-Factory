import { describe, expect, it } from "vitest";
import {
  formatArticleMediaSummary,
  resolveDeferredArticleEditorView,
  shouldAutoActivateDeferredArticleEditor
} from "../src/routes/publish-article-page-helpers";

describe("publish article deferred editor view", () => {
  it("does not auto activate the editor for a blank new article", () => {
    expect(
      shouldAutoActivateDeferredArticleEditor({
        hasRestoredDraft: false,
        isEditingExistingArticle: false
      })
    ).toBe(false);
  });

  it("auto activates the editor when restoring a draft or editing an existing article", () => {
    expect(
      shouldAutoActivateDeferredArticleEditor({
        hasRestoredDraft: true,
        isEditingExistingArticle: false
      })
    ).toBe(true);

    expect(
      shouldAutoActivateDeferredArticleEditor({
        hasRestoredDraft: false,
        isEditingExistingArticle: true
      })
    ).toBe(true);
  });

  it("keeps the fallback shell before the editor is activated", () => {
    expect(
      resolveDeferredArticleEditorView({
        hasEditorComponent: false,
        isEditorActivated: false,
        isEditorLoading: false
      })
    ).toBe("fallback");
  });

  it("shows loading only after activation begins and switches to editor after the chunk is ready", () => {
    expect(
      resolveDeferredArticleEditorView({
        hasEditorComponent: false,
        isEditorActivated: true,
        isEditorLoading: true
      })
    ).toBe("loading");

    expect(
      resolveDeferredArticleEditorView({
        hasEditorComponent: true,
        isEditorActivated: true,
        isEditorLoading: false
      })
    ).toBe("editor");
  });
});

describe("formatArticleMediaSummary", () => {
  it("summarizes inserted article media without implying a fixed cap", () => {
    expect(
      formatArticleMediaSummary({
        imageCount: 0,
        videoCount: 0
      })
    ).toBe("未插入媒体");

    expect(
      formatArticleMediaSummary({
        imageCount: 8,
        videoCount: 3
      })
    ).toBe("8 张图片 · 3 个视频");
  });
});
