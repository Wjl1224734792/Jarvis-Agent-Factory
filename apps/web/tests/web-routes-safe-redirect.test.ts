import { describe, expect, it } from "vitest";
import {
  buildSafeRedirectPath,
  isExternalHttpUrl,
  normalizeSafeRedirectFromPath
} from "../src/lib/web-routes";

describe("safe redirect routes", () => {
  it("builds target-only safe redirect url", () => {
    const path = buildSafeRedirectPath("https://example.com/a?b=1");
    expect(path).toBe("/safe-redirect?target=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1");
  });

  it("builds safe redirect url with from path", () => {
    const path = buildSafeRedirectPath("https://example.com/a", "/circle?tab=hot#top");
    expect(path).toBe("/safe-redirect?target=https%3A%2F%2Fexample.com%2Fa&from=%2Fcircle%3Ftab%3Dhot%23top");
  });

  it("detects external http links only", () => {
    expect(isExternalHttpUrl("https://example.com", "https://feijia.local")).toBe(true);
    expect(isExternalHttpUrl("/models", "https://feijia.local")).toBe(false);
    expect(isExternalHttpUrl("javascript:alert(1)", "https://feijia.local")).toBe(false);
  });

  it("keeps safe redirect return paths on-site", () => {
    expect(normalizeSafeRedirectFromPath("/posts/post_1?tab=comments#top")).toBe(
      "/posts/post_1?tab=comments#top"
    );
    expect(normalizeSafeRedirectFromPath(null)).toBe("/");
    expect(normalizeSafeRedirectFromPath("https://evil.example")).toBe("/");
    expect(normalizeSafeRedirectFromPath("//evil.example/path")).toBe("/");
    expect(normalizeSafeRedirectFromPath("\\\\evil.example\\path")).toBe("/");
    expect(normalizeSafeRedirectFromPath("/safe-redirect?target=https://evil.example")).toBe("/");
  });
});
