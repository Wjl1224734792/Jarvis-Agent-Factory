import { describe, expect, it } from "vitest";
import {
  buildRichTextToolbarState,
  extractPlainTextFromHtml,
  getRichTextMediaInsertions,
  normalizeRichTextLinkHref,
  shouldSyncRichTextValue
} from "../src/components/rich-text-editor-helpers";

describe("buildRichTextToolbarState", () => {
  it("builds a full toolbar state snapshot from the editor activity map", () => {
    const editor = {
      isActive(nameOrAttributes: string | Record<string, unknown>, attributes?: Record<string, unknown>) {
        if (typeof nameOrAttributes === "object" && nameOrAttributes.textAlign === "center") {
          return true;
        }

        if (
          nameOrAttributes === "bold" ||
          nameOrAttributes === "underline" ||
          nameOrAttributes === "link" ||
          nameOrAttributes === "strike" ||
          nameOrAttributes === "highlight" ||
          nameOrAttributes === "code" ||
          nameOrAttributes === "codeBlock" ||
          nameOrAttributes === "taskList" ||
          nameOrAttributes === "table"
        ) {
          return true;
        }

        if (nameOrAttributes === "heading" && attributes?.level === 3) {
          return true;
        }

        return false;
      },
      can() {
        return {
          chain() {
            return {
              focus() {
                return {
                  undo() {
                    return false;
                  },
                  redo() {
                    return true;
                  }
                };
              }
            };
          }
        };
      }
    };

    const toolbar = buildRichTextToolbarState(editor);

    expect(toolbar.find((item) => item.key === "bold")?.active).toBe(true);
    expect(toolbar.find((item) => item.key === "underline")?.active).toBe(true);
    expect(toolbar.find((item) => item.key === "heading3")?.active).toBe(true);
    expect(toolbar.find((item) => item.key === "alignCenter")?.active).toBe(true);
    expect(toolbar.find((item) => item.key === "strike")?.active).toBe(true);
    expect(toolbar.find((item) => item.key === "highlight")?.active).toBe(true);
    expect(toolbar.find((item) => item.key === "code")?.active).toBe(true);
    expect(toolbar.find((item) => item.key === "codeBlock")?.active).toBe(true);
    expect(toolbar.find((item) => item.key === "taskList")?.active).toBe(true);
    expect(toolbar.find((item) => item.key === "table")?.active).toBe(true);
    expect(toolbar.find((item) => item.key === "undo")?.disabled).toBe(true);
    expect(toolbar.find((item) => item.key === "redo")?.disabled).toBe(false);
  });

  it("treats left alignment as the default active state", () => {
    const toolbar = buildRichTextToolbarState({
      isActive() {
        return false;
      },
      can() {
        return {
          chain() {
            return {
              focus() {
                return {
                  undo() {
                    return true;
                  },
                  redo() {
                    return true;
                  }
                };
              }
            };
          }
        };
      }
    });

    expect(toolbar.find((item) => item.key === "alignLeft")?.active).toBe(true);
    expect(toolbar.find((item) => item.key === "alignCenter")?.active).toBe(false);
    expect(toolbar.find((item) => item.key === "alignRight")?.active).toBe(false);
  });
});

describe("getRichTextMediaInsertions", () => {
  it("returns tiptap insert payloads for image and video uploads", () => {
    expect(
      getRichTextMediaInsertions("image", [{ id: "img_1", url: "https://cdn.example.com/cover.jpg", fileName: "cover.jpg" }])
    ).toEqual([{ type: "image", attrs: { src: "https://cdn.example.com/cover.jpg", alt: "cover.jpg" } }]);

    expect(
      getRichTextMediaInsertions("video", [{ id: "vid_1", url: "https://cdn.example.com/clip.mp4" }])
    ).toEqual([{ type: "videoBlock", attrs: { src: "https://cdn.example.com/clip.mp4", poster: null } }]);
  });

  it("returns table insertion payloads", () => {
    expect(getRichTextMediaInsertions("table", [])).toEqual([
      {
        type: "table",
        attrs: {
          rows: 3,
          cols: 3,
          withHeaderRow: true
        }
      }
    ]);
  });
});

describe("shouldSyncRichTextValue", () => {
  it("only syncs when the next html differs from the editor html", () => {
    expect(shouldSyncRichTextValue("<p>same</p>", "<p>same</p>")).toBe(false);
    expect(shouldSyncRichTextValue("<p>old</p>", "<p>new</p>")).toBe(true);
  });
});

describe("extractPlainTextFromHtml", () => {
  it("strips markup and keeps readable text blocks", () => {
    expect(
      extractPlainTextFromHtml(
        "<h2>段落标题</h2><p>第一段 <strong>加粗</strong> 文本。</p><figure data-video-block=\"true\"><video src=\"https://cdn.example.com/demo.mp4\"></video></figure><p>结尾。</p>"
      )
    ).toBe("段落标题 第一段 加粗 文本。 结尾。");
  });

  it("returns an empty string for blank rich text html", () => {
    expect(extractPlainTextFromHtml("   ")).toBe("");
    expect(extractPlainTextFromHtml("<p></p>")).toBe("");
  });
});

describe("normalizeRichTextLinkHref", () => {
  it("normalizes bare domains into https urls", () => {
    expect(normalizeRichTextLinkHref("example.com/article")).toBe("https://example.com/article");
    expect(normalizeRichTextLinkHref("www.example.com")).toBe("https://www.example.com");
  });

  it("preserves explicit schemes and clears blank input", () => {
    expect(normalizeRichTextLinkHref("https://example.com")).toBe("https://example.com");
    expect(normalizeRichTextLinkHref("mailto:hello@example.com")).toBe("mailto:hello@example.com");
    expect(normalizeRichTextLinkHref("   ")).toBe("");
  });
});
