import { describe, expect, it } from "vitest";
import {
  APP_ROUTES,
  buildLoginRedirectUrl,
  resolveSafeRedirectPath
} from "@feijia/shared";

describe("web auth redirect helpers", () => {
  it("preserves the full in-app destination when building a login redirect url", () => {
    expect(
      buildLoginRedirectUrl(APP_ROUTES.webLogin, {
        pathname: APP_ROUTES.webSettings,
        search: "?tab=privacy",
        hash: "#phone"
      })
    ).toBe("/login?redirect=%2Fsettings%3Ftab%3Dprivacy%23phone");
  });

  it("rejects unsafe or self-referential redirect targets", () => {
    expect(
      resolveSafeRedirectPath({
        candidate: "https://example.com/phishing",
        fallbackPath: APP_ROUTES.feedHome,
        blockedPaths: [APP_ROUTES.webLogin]
      })
    ).toBe(APP_ROUTES.feedHome);

    expect(
      resolveSafeRedirectPath({
        candidate: `${APP_ROUTES.webLogin}?redirect=%2Fsettings`,
        fallbackPath: APP_ROUTES.feedHome,
        blockedPaths: [APP_ROUTES.webLogin]
      })
    ).toBe(APP_ROUTES.feedHome);
  });
});
