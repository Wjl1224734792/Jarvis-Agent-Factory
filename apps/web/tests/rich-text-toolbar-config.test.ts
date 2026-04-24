import { describe, expect, it } from "vitest";
import {
  RICH_TEXT_COLOR_SWATCHES,
  RICH_TEXT_TOOLBAR_GROUPS,
  getToolbarControlLabel,
  RICH_TEXT_TOOLBAR_CONTROLS
} from "../src/components/rich-text-toolbar-config";

describe("rich text toolbar config", () => {
  it("keeps tooltip labels for icon-only controls", () => {
    expect(getToolbarControlLabel("bold")).toBe("加粗");
    expect(getToolbarControlLabel("image")).toBe("图片");
    expect(getToolbarControlLabel("insertTable")).toBe("插入表格");
  });

  it("defines labels for every rendered toolbar control", () => {
    expect(RICH_TEXT_TOOLBAR_CONTROLS.every((item) => item.label.trim().length > 0)).toBe(true);
  });

  it("groups controls into stable toolbar sections", () => {
    expect(RICH_TEXT_TOOLBAR_GROUPS.map((group) => group.key)).toEqual([
      "inline",
      "structure",
      "insert",
      "history"
    ]);
    expect(RICH_TEXT_TOOLBAR_GROUPS.find((group) => group.key === "inline")?.controls).toContain("bold");
    expect(RICH_TEXT_TOOLBAR_GROUPS.find((group) => group.key === "insert")?.controls).toContain("image");
  });

  it("ships editor color swatches with distinct values", () => {
    expect(RICH_TEXT_COLOR_SWATCHES.length).toBeGreaterThanOrEqual(5);
    expect(new Set(RICH_TEXT_COLOR_SWATCHES.map((item) => item.value)).size).toBe(RICH_TEXT_COLOR_SWATCHES.length);
  });
});
