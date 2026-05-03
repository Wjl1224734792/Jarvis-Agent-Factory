import { describe, expect, it } from "vitest";
import {
  getAuthCacheScope,
  shouldResetAuthCache
} from "../src/features/auth/auth-cache-helpers";

describe("auth-cache-helpers", () => {
  it("builds guest and user cache scopes", () => {
    expect(getAuthCacheScope("anonymous")).toBe("guest");
    expect(getAuthCacheScope("loading")).toBe("guest");
    expect(getAuthCacheScope("authenticated", "user_1")).toBe("user:user_1");
  });

  it("resets cache only when auth scope actually changes", () => {
    expect(shouldResetAuthCache(null, "guest")).toBe(false);
    expect(shouldResetAuthCache("guest", "guest")).toBe(false);
    expect(shouldResetAuthCache("guest", "user:user_1")).toBe(true);
    expect(shouldResetAuthCache("user:user_1", "guest")).toBe(true);
  });
});
