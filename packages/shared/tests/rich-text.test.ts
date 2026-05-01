import { describe, expect, it } from "vitest";
import {
  normalizeRichTextLinkHref,
  normalizeRichTextMediaUrl,
  normalizeRichTextVideoSource
} from "../src";

describe("rich text URL helpers", () => {
  it("normalizes editor links and rejects unsafe protocols", () => {
    expect(normalizeRichTextLinkHref("example.com/article")).toBe("https://example.com/article");
    expect(normalizeRichTextLinkHref("www.example.com")).toBe("https://www.example.com");
    expect(normalizeRichTextLinkHref("//example.com/article")).toBe("https://example.com/article");
    expect(normalizeRichTextLinkHref("https://example.com")).toBe("https://example.com");
    expect(normalizeRichTextLinkHref("mailto:hello@example.com")).toBe("mailto:hello@example.com");
    expect(normalizeRichTextLinkHref("/posts/post_1")).toBe("/posts/post_1");
    expect(normalizeRichTextLinkHref("blob:http://localhost:17380/link-preview")).toBe("");
    expect(normalizeRichTextLinkHref("javascript:alert(1)")).toBe("");
    expect(normalizeRichTextLinkHref("bad url")).toBe("");
  });

  it("normalizes image and video URLs while keeping local blob previews", () => {
    expect(normalizeRichTextMediaUrl("cdn.example.com/cover.jpg")).toBe("https://cdn.example.com/cover.jpg");
    expect(normalizeRichTextMediaUrl("//cdn.example.com/clip.mp4")).toBe("https://cdn.example.com/clip.mp4");
    expect(normalizeRichTextMediaUrl("https://cdn.example.com/clip.mp4")).toBe("https://cdn.example.com/clip.mp4");
    expect(normalizeRichTextMediaUrl("blob:http://localhost:17380/local-preview")).toBe(
      "blob:http://localhost:17380/local-preview"
    );
    expect(normalizeRichTextMediaUrl("/uploads/clip.mp4")).toBe("");
    expect(normalizeRichTextMediaUrl("mailto:hello@example.com")).toBe("");
    expect(normalizeRichTextMediaUrl("javascript:alert(1)")).toBe("");
  });

  it("keeps safe iframe video embeds and rejects iframe embeds without usable sources", () => {
    const iframe = '<iframe src="https://player.bilibili.com/player.html"></iframe>';

    expect(normalizeRichTextVideoSource(iframe)).toBe(iframe);
    expect(normalizeRichTextVideoSource("cdn.example.com/clip.mp4")).toBe("https://cdn.example.com/clip.mp4");
    expect(normalizeRichTextVideoSource("blob:http://localhost:17380/local-video")).toBe(
      "blob:http://localhost:17380/local-video"
    );
    expect(normalizeRichTextVideoSource('<iframe src="javascript:alert(1)"></iframe>')).toBe("");
    expect(normalizeRichTextVideoSource("<iframe></iframe>")).toBe("");
  });
});
