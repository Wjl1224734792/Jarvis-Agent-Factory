import { describe, expect, it } from "vitest";
import { adminRichTextToolbarConfig } from "../src/components/admin-rich-text-toolbar";

describe("adminRichTextToolbarConfig", () => {
  it("keeps the inline toolbar icon-only labels available for tooltips", () => {
    expect(adminRichTextToolbarConfig.inline.find((item) => item.key === "bold")?.label).toBe("加粗");
    expect(adminRichTextToolbarConfig.inline.find((item) => item.key === "heading2")?.label).toBe("二级标题");
    expect(adminRichTextToolbarConfig.inline.find((item) => item.key === "textColor")?.label).toBe("文字颜色");
  });

  it("includes media and table controls in the secondary toolbar group", () => {
    expect(adminRichTextToolbarConfig.table.map((item) => item.key)).toEqual(
      expect.arrayContaining(["insertTable", "addRow", "deleteColumn", "image", "video"])
    );
  });
});
