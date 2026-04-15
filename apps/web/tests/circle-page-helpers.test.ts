import { describe, expect, it } from "vitest";
import {
  buildCircleMediaItems,
  getCircleColumnCount,
  getCircleCardMediaAspectClass,
  getLoopedNextIndex,
  getLoopedPrevIndex,
  partitionCircleFeedIntoColumns,
  partitionCircleFeedShortestColumn
} from "../src/routes/circle-page-helpers";

describe("circle page helpers", () => {
  it("cycles shorter portrait ratios for web without a fixed three-column pattern", () => {
    expect(getCircleCardMediaAspectClass(0)).toBe("aspect-[3/4]");
    expect(getCircleCardMediaAspectClass(3)).toBe("aspect-[2/3]");
    expect(getCircleCardMediaAspectClass(5)).toBe("aspect-[3/4]");
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
    expect(getCircleColumnCount(1600)).toBe(5);
  });

  it("partitions posts into round-robin columns with stable absoluteIndex", () => {
    expect(
      partitionCircleFeedIntoColumns(
        [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }],
        2
      )
    ).toEqual([
      [
        { item: { id: "a" }, absoluteIndex: 0 },
        { item: { id: "c" }, absoluteIndex: 2 },
        { item: { id: "e" }, absoluteIndex: 4 }
      ],
      [
        { item: { id: "b" }, absoluteIndex: 1 },
        { item: { id: "d" }, absoluteIndex: 3 }
      ]
    ]);
  });

  it("partitions into shortest-column stacks by estimated card height", () => {
    expect(
      partitionCircleFeedShortestColumn(
        [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }],
        2
      )
    ).toEqual([
      [
        { item: { id: "a" }, absoluteIndex: 0 },
        { item: { id: "d" }, absoluteIndex: 3 }
      ],
      [
        { item: { id: "b" }, absoluteIndex: 1 },
        { item: { id: "c" }, absoluteIndex: 2 },
        { item: { id: "e" }, absoluteIndex: 4 }
      ]
    ]);
  });
});
