import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readSource(filePath: string) {
  return readFileSync(path.resolve(process.cwd(), filePath), "utf8");
}

describe("admin comment ip location display", () => {
  it("maps and renders author ip location labels for every comment domain", () => {
    const source = readSource("apps/admin/src/features/posts/post-comments-page.tsx");
    const mappedDomainCount = source.match(/authorIpLocationLabel: item\.author\.ipLocationLabel \?\? null/g)?.length ?? 0;

    expect(mappedDomainCount).toBe(5);
    expect(source.includes("record.authorIpLocationLabel")).toBe(true);
  });
});
