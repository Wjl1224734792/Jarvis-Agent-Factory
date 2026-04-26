import { describe, expect, it } from "vitest";
import { sanitizeAdminRichTextHtml } from "../src/components/admin-rich-text-html";

describe("sanitizeAdminRichTextHtml", () => {
  it("removes scripts and event handlers while keeping rich text content", () => {
    const sanitized = sanitizeAdminRichTextHtml(
      '<script>alert(1)</script><p onclick="alert(1)">ok</p><img src="https://cdn.example.com/a.png" onerror="alert(1)" />'
    );

    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).toContain("<p>ok</p>");
    expect(sanitized).toContain('src="https://cdn.example.com/a.png"');
  });

  it("removes dangerous protocols from links and media", () => {
    const sanitized = sanitizeAdminRichTextHtml(
      '<a href="javascript:alert(1)">bad</a><img src="data:text/html;base64,evil" /><a href="https://example.com">ok</a>'
    );

    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("data:text/html");
    expect(sanitized).toContain('href="https://example.com"');
  });

  it("keeps trusted iframes and removes untrusted iframe embeds", () => {
    const sanitized = sanitizeAdminRichTextHtml(
      '<iframe src="https://player.bilibili.com/player.html?bvid=BV1xx411x7xx" onload="alert(1)"></iframe><iframe src="https://evil.example/embed"></iframe>'
    );

    expect(sanitized).toContain("player.bilibili.com");
    expect(sanitized).not.toContain("onload");
    expect(sanitized).not.toContain("evil.example");
  });
});
