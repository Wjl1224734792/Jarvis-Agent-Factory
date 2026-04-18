import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildRestoredPreviewUrlMap,
  restorePersistedPreviewAsset,
  restorePersistedPreviewAssets,
  revokePreviewAsset,
  revokePreviewAssets
} from "../src/lib/uploads/local-preview-assets";

const createObjectURLMock = vi.fn<(file: File) => string>();
const revokeObjectURLMock = vi.fn<(url: string) => void>();
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  createObjectURLMock.mockReset();
  revokeObjectURLMock.mockReset();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURLMock
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURLMock
  });
});

afterEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: originalCreateObjectURL
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: originalRevokeObjectURL
  });
});

describe("local preview assets", () => {
  it("rehydrates persisted local assets with a fresh blob url", () => {
    createObjectURLMock.mockReturnValue("blob:restored-cover");
    const file = new File(["cover"], "cover.png", { type: "image/png" });

    const restored = restorePersistedPreviewAsset({
      id: "cover-1",
      url: "blob:stale-cover",
      file,
      isLocal: true
    });

    expect(restored?.previousUrl).toBe("blob:stale-cover");
    expect(restored?.asset.url).toBe("blob:restored-cover");
    expect(createObjectURLMock).toHaveBeenCalledWith(file);
  });

  it("builds a replacement map for restored editor media urls", () => {
    createObjectURLMock
      .mockReturnValueOnce("blob:image-restored")
      .mockReturnValueOnce("blob:video-restored");

    const restoredEntries = restorePersistedPreviewAssets([
      {
        id: "image-1",
        url: "blob:image-stale",
        file: new File(["image"], "image.png", { type: "image/png" }),
        isLocal: true
      },
      {
        id: "video-1",
        url: "blob:video-stale",
        file: new File(["video"], "video.mp4", { type: "video/mp4" }),
        isLocal: true
      }
    ]);

    expect(buildRestoredPreviewUrlMap(restoredEntries)).toEqual({
      "blob:image-stale": "blob:image-restored",
      "blob:video-stale": "blob:video-restored"
    });
  });

  it("only revokes local blob previews", () => {
    revokePreviewAsset({
      url: "blob:local-cover",
      isLocal: true
    });
    revokePreviewAssets([
      {
        url: "blob:gallery-1",
        isLocal: true
      },
      {
        url: "https://cdn.example.com/remote.png",
        isLocal: false
      }
    ]);

    expect(revokeObjectURLMock).toHaveBeenCalledTimes(2);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:local-cover");
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:gallery-1");
  });
});
