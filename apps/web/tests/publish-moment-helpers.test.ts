import { describe, expect, it } from "vitest";
import {
  canAppendMomentImages,
  canReplaceWithMomentVideo,
  canSubmitMomentMedia
} from "../src/routes/publish-moment-helpers";

describe("publish moment helpers", () => {
  it("limits images to six", () => {
    expect(canAppendMomentImages(2, 3)).toBe(true);
    expect(canAppendMomentImages(4, 3)).toBe(false);
  });

  it("allows only one uploaded video", () => {
    expect(canReplaceWithMomentVideo(1)).toBe(true);
    expect(canReplaceWithMomentVideo(2)).toBe(false);
  });

  it("rejects mixed media payloads", () => {
    expect(canSubmitMomentMedia(3, 0)).toBe(true);
    expect(canSubmitMomentMedia(0, 1)).toBe(true);
    expect(canSubmitMomentMedia(2, 1)).toBe(false);
  });
});
