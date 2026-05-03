import { describe, expect, it } from "vitest";
import {
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
});
