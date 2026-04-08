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
});
