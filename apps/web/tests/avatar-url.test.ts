import { describe, expect, it } from "vitest";

import { resolveUserAvatarSrc } from "../src/lib/avatar-url";

describe("avatar url helpers", () => {
  it("does not synthesize an avatar image when the user has not set one", () => {
    expect(resolveUserAvatarSrc(null)).toBeUndefined();
    expect(resolveUserAvatarSrc(undefined)).toBeUndefined();
    expect(resolveUserAvatarSrc("   ")).toBeUndefined();
  });

  it("returns the trimmed user avatar url when one exists", () => {
    expect(resolveUserAvatarSrc(" https://cdn.example.com/avatar.png ")).toBe(
      "https://cdn.example.com/avatar.png"
    );
  });
});
