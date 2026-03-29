import { describe, expect, it } from "vitest";
import {
  buildCircleMediaItems,
  getCircleCardHeightClass,
  getLoopedNextIndex,
  getLoopedPrevIndex
} from "../src/routes/circle-page-helpers";

describe("circle page helpers", () => {
  it("cycles masonry heights without a fixed three-column pattern", () => {
    expect(getCircleCardHeightClass(0)).toBe("h-[15.25rem]");
    expect(getCircleCardHeightClass(3)).toBe("h-[16.25rem]");
    expect(getCircleCardHeightClass(5)).toBe("h-[15.25rem]");
  });

  it("builds image media items unless a video exists", () => {
    expect(
      buildCircleMediaItems({
        title: "港口夜拍",
        images: [{ url: "image-a" }, { url: "image-b" }],
        videos: []
      })
    ).toEqual([
      { kind: "image", url: "image-a", label: "港口夜拍 1" },
      { kind: "image", url: "image-b", label: "港口夜拍 2" }
    ]);

    expect(
      buildCircleMediaItems({
        title: "低空巡检",
        images: [{ url: "image-a" }],
        videos: [{ url: "video-a" }, { url: "video-b" }]
      })
    ).toEqual([{ kind: "video", url: "video-a", label: "低空巡检" }]);
  });

  it("loops carousel indexes in both directions", () => {
    expect(getLoopedNextIndex(0, 3)).toBe(1);
    expect(getLoopedNextIndex(2, 3)).toBe(0);
    expect(getLoopedPrevIndex(0, 3)).toBe(2);
    expect(getLoopedPrevIndex(2, 3)).toBe(1);
  });
});
