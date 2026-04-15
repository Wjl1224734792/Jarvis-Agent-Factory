import { describe, expect, it } from "vitest";
import {
  buildCircleMediaItems,
  buildVirtualCircleRows,
  getCircleColumnCount,
  getCircleCardMediaAspectClass,
  getLoopedNextIndex,
  getLoopedPrevIndex
} from "../src/routes/circle-page-helpers";

describe("circle page helpers", () => {
  it("cycles portrait aspect ratios near 9:16 without a fixed three-column pattern", () => {
    expect(getCircleCardMediaAspectClass(0)).toBe("aspect-[9/16]");
    expect(getCircleCardMediaAspectClass(3)).toBe("aspect-[9/15]");
    expect(getCircleCardMediaAspectClass(5)).toBe("aspect-[9/16]");
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

  it("derives responsive circle column counts from viewport width", () => {
    expect(getCircleColumnCount(375)).toBe(1);
    expect(getCircleColumnCount(768)).toBe(2);
    expect(getCircleColumnCount(1200)).toBe(3);
    expect(getCircleColumnCount(1440)).toBe(4);
  });

  it("groups posts into virtual rows while preserving order", () => {
    expect(
      buildVirtualCircleRows(
        [
          { id: "a" },
          { id: "b" },
          { id: "c" },
          { id: "d" },
          { id: "e" }
        ],
        2
      )
    ).toEqual([
      {
        id: "a:b",
        items: [
          { id: "a", absoluteIndex: 0 },
          { id: "b", absoluteIndex: 1 }
        ]
      },
      {
        id: "c:d",
        items: [
          { id: "c", absoluteIndex: 2 },
          { id: "d", absoluteIndex: 3 }
        ]
      },
      {
        id: "e",
        items: [{ id: "e", absoluteIndex: 4 }]
      }
    ]);
  });
});
