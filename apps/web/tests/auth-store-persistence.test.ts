import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPersistedAuthState,
  readPersistedAuthState,
  WEB_AUTH_STORAGE_KEY,
  writePersistedAuthState
} from "../src/features/auth/auth-store-persistence";

function createStorage() {
  const storage = new Map<string, string>();

  return {
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    }
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: createStorage()
    }
  });
});

describe("auth store persistence", () => {
  it("writes and reads the persisted authenticated user", () => {
    writePersistedAuthState({
      id: "user_1",
      displayName: "飞友测试",
      avatarUrl: null,
      role: "user"
    });

    expect(readPersistedAuthState()).toEqual({
      user: {
        id: "user_1",
        displayName: "飞友测试",
        avatarUrl: null,
        role: "user"
      }
    });
  });

  it("clears persisted auth state", () => {
    window.localStorage.setItem(WEB_AUTH_STORAGE_KEY, JSON.stringify({ user: { id: "u" } }));
    clearPersistedAuthState();

    expect(window.localStorage.getItem(WEB_AUTH_STORAGE_KEY)).toBeNull();
  });

  it("drops invalid persisted payloads", () => {
    window.localStorage.setItem(WEB_AUTH_STORAGE_KEY, "{invalid");

    expect(readPersistedAuthState()).toBeNull();
    expect(window.localStorage.getItem(WEB_AUTH_STORAGE_KEY)).toBeNull();
  });
});
