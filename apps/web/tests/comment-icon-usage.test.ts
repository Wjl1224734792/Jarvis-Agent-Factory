import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readSource(filePath: string) {
  return readFileSync(path.resolve(process.cwd(), filePath), "utf8");
}

describe("comment icon usage", () => {
  it("uses the home feed MessageCircleIcon style for visible comment entry points", () => {
    const commentEntryFiles = [
      "apps/web/src/routes/post-detail-page.tsx",
      "apps/web/src/routes/model-detail-page.tsx",
      "apps/web/src/routes/model-comments-section.tsx",
      "apps/web/src/routes/circle-page-detail.tsx",
      "apps/web/src/routes/notifications-page.tsx"
    ];

    const homeSource = readSource("apps/web/src/routes/home-page.tsx");
    expect(homeSource.includes("MessageCircleIcon")).toBe(true);

    for (const filePath of commentEntryFiles) {
      const source = readSource(filePath);
      expect(source.includes("MessageCircleIcon"), `${filePath}: should use MessageCircleIcon`).toBe(true);
      expect(source.includes("MessageSquareTextIcon"), `${filePath}: should not use MessageSquareTextIcon`).toBe(false);
    }
  });
});
