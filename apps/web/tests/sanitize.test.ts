import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "../src/lib/sanitize";

describe("sanitizeHtml", () => {
  it("strips data links from anchor href while keeping safe links", () => {
    const sanitized = sanitizeHtml(
      '<a href="data:text/html;base64,ZXZpbA==">bad</a><a href="https://example.com/page">ok</a>'
    );

    expect(sanitized).not.toContain('href="data:');
    expect(sanitized).toContain('href="https://example.com/page"');
  });

  it("keeps video source tags for network videos", () => {
    const sanitized = sanitizeHtml(
      '<video controls><source src="https://cdn.example.com/video.mp4" type="video/mp4" /></video>'
    );

    expect(sanitized).toContain("<video");
    expect(sanitized).toContain("<source");
    expect(sanitized).toContain('src="https://cdn.example.com/video.mp4"');
  });

  it("keeps trusted iframes and removes untrusted ones", () => {
    const sanitized = sanitizeHtml(
      '<iframe src="https://player.bilibili.com/player.html?bvid=BV1xx411x7xx"></iframe><iframe src="https://evil.example/embed"></iframe>'
    );

    expect(sanitized).toContain("player.bilibili.com");
    expect(sanitized).not.toContain("evil.example");
  });
});
