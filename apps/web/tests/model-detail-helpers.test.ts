import { describe, expect, it } from "vitest";
import { formatModelMetric } from "../src/routes/model-detail-helpers";

describe("model detail helpers", () => {
  it("returns a clear empty state instead of hardcoded fallback values", () => {
    expect(formatModelMetric(null, (value) => `${value} km`)).toBe("未公开");
  });

  it("formats published values through the provided formatter", () => {
    expect(formatModelMetric(18, (value) => `${value} km`)).toBe("18 km");
  });
});
