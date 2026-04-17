import { describe, expect, it } from "vitest";
import {
  getHotModelsSidebarQueryKey,
  formatModelMetric,
  formatModelPriceRange
} from "../src/routes/model-detail-helpers";

describe("model detail helpers", () => {
  it("returns a clear empty state instead of hardcoded fallback values", () => {
    expect(formatModelMetric(null, (value) => `${value} km`)).toBe("未公开");
  });

  it("formats published values through the provided formatter", () => {
    expect(formatModelMetric(18, (value) => `${value} km`)).toBe("18 km");
  });

  it("formats identical prices as a single value", () => {
    expect(formatModelPriceRange(4999, 4999)).toBe("¥4,999");
  });

  it("formats different prices as a range", () => {
    expect(formatModelPriceRange(4999, 6999)).toBe("¥4,999 - ¥6,999");
  });

  it("returns null when price is unknown", () => {
    expect(formatModelPriceRange(null, null)).toBeNull();
  });

  it("builds the hot-models sidebar key from category only", () => {
    expect(getHotModelsSidebarQueryKey("camera-drone")).toEqual([
      "hot-models-sidebar",
      "camera-drone"
    ]);
    expect(getHotModelsSidebarQueryKey(null)).toEqual(["hot-models-sidebar", null]);
  });
});
