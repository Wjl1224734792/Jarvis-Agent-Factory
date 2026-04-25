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

  it("keeps local blob media previews while stripping blob links", () => {
    const sanitized = sanitizeHtml(
      [
        '<img src="blob:http://localhost:17380/image-preview" />',
        '<video controls src="blob:http://localhost:17380/video-preview"></video>',
        '<a href="blob:http://localhost:17380/link-preview">bad</a>'
      ].join("")
    );

    expect(sanitized).toContain('src="blob:http://localhost:17380/image-preview"');
    expect(sanitized).toContain('src="blob:http://localhost:17380/video-preview"');
    expect(sanitized).not.toContain('href="blob:');
  });

  it("strips local blob media when rendering persisted content", () => {
    const sanitized = sanitizeHtml(
      [
        '<img src="blob:http://localhost:17380/image-preview" />',
        '<video controls poster="blob:http://localhost:17380/poster-preview"><source src="blob:http://localhost:17380/video-preview" type="video/mp4" /></video>',
        '<img src="https://cdn.example.com/image.png" />'
      ].join(""),
      { allowBlobMedia: false }
    );

    expect(sanitized).not.toContain("blob:");
    expect(sanitized).toContain('src="https://cdn.example.com/image.png"');
  });

  it("keeps trusted iframes and removes untrusted ones", () => {
    const sanitized = sanitizeHtml(
      '<iframe src="https://player.bilibili.com/player.html?bvid=BV1xx411x7xx"></iframe><iframe src="https://evil.example/embed"></iframe>'
    );

    expect(sanitized).toContain("player.bilibili.com");
    expect(sanitized).not.toContain("evil.example");
  });
});
