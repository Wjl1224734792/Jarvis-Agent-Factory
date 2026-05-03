import { afterEach, describe, expect, it } from "vitest";
import type { DraftFileRecord } from "../src/lib/uploads/types";
import { clearDraftSnapshot, loadDraftSnapshot, saveDraftSnapshot } from "../src/lib/uploads/draft-store";

type DraftRecord = {
  key: string;
  version: number;
  updatedAt: number;
  data: {
    title: string;
    blobLike: { name: string; payload: string };
  };
  filesBySlot: Record<string, DraftFileRecord[]>;
};

function createIndexedDbMock() {
  const records = new Map<string, unknown>();
  const storeNames = new Set<string>();

  return {
    open: () => {
      const request: Record<string, unknown> = {};
      const database = {
        objectStoreNames: {
          contains: (name: string) => storeNames.has(name)
        },
        createObjectStore: (name: string) => {
          storeNames.add(name);
        },
        transaction: () => {
          const transaction: Record<string, unknown> = {};
          const objectStore = {
            put: (value: { key: string }) => {
              const putRequest: Record<string, unknown> = {};
              queueMicrotask(() => {
                records.set(value.key, value);
                (putRequest.onsuccess as (() => void) | undefined)?.();
                (transaction.oncomplete as (() => void) | undefined)?.();
              });
              return putRequest;
            },
            get: (key: string) => {
              const getRequest: Record<string, unknown> = {};
              queueMicrotask(() => {
                getRequest.result = records.get(key);
                (getRequest.onsuccess as (() => void) | undefined)?.();
                (transaction.oncomplete as (() => void) | undefined)?.();
              });
              return getRequest;
            },
            delete: (key: string) => {
              const deleteRequest: Record<string, unknown> = {};
              queueMicrotask(() => {
                records.delete(key);
                (deleteRequest.onsuccess as (() => void) | undefined)?.();
                (transaction.oncomplete as (() => void) | undefined)?.();
              });
              return deleteRequest;
            }
          };
          transaction.objectStore = () => objectStore;
          return transaction;
        },
        close: () => undefined
      };

      queueMicrotask(() => {
        if (!storeNames.has("drafts")) {
          request.result = database;
          (request.onupgradeneeded as (() => void) | undefined)?.();
        }
        request.result = database;
        (request.onsuccess as (() => void) | undefined)?.();
      });
      return request;
    }
  };
}

afterEach(() => {
  // @ts-expect-error test reset
  delete globalThis.window;
});

describe("draft-store", () => {
  it("saves, loads and clears draft snapshot", async () => {
    const indexedDB = createIndexedDbMock();
    // @ts-expect-error test mock
    globalThis.window = { indexedDB };

    const snapshot: DraftRecord = {
      key: "draft:test",
      version: 1,
      updatedAt: Date.now(),
      data: {
        title: "草稿标题",
        blobLike: {
          name: "cover.png",
          payload: "blob-content"
        }
      },
      filesBySlot: {}
    };

    await saveDraftSnapshot(snapshot);
    const loaded = await loadDraftSnapshot<DraftRecord["data"]>("draft:test");
    expect(loaded?.data.title).toBe("草稿标题");
    expect(loaded?.data.blobLike.name).toBe("cover.png");

    await clearDraftSnapshot("draft:test");
    const cleared = await loadDraftSnapshot<DraftRecord["data"]>("draft:test");
    expect(cleared).toBeNull();
  });
});
