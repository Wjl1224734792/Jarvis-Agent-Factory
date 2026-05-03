import { describe, expect, it } from "vitest";
import {
  resolveModerationModeCopy,
  resolveModerationModeLabel
} from "../src/lib/moderation-tracking";

describe("moderation tracking mode helpers", () => {
  it("returns mode labels for all tri-state modes", () => {
    expect(resolveModerationModeLabel("manual")).toBe("人工审核");
    expect(resolveModerationModeLabel("ai")).toBe("AI审核");
    expect(resolveModerationModeLabel("automatic")).toBe("自动审核");
  });

  it("prefers tri-state mode copy when provided", () => {
    expect(
      resolveModerationModeCopy({
        mode: "automatic",
        autoCopy: "直接自动放行"
      })
    ).toBe("直接自动放行");
  });

  it("keeps boolean compatibility for legacy callers", () => {
    expect(
      resolveModerationModeCopy({
        enabled: false,
        manualCopy: "进入人工队列"
      })
    ).toBe("进入人工队列");
  });

  it("describes automatic mode as final pass-or-fail without manual review", () => {
    expect(resolveModerationModeCopy({ mode: "automatic" })).toContain(
      "不通过则直接拦截"
    );
  });
});
