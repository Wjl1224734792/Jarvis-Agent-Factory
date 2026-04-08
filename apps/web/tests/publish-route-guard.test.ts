import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "@feijia/shared";
import { resolveProtectedRouteRedirect } from "../src/features/auth/protected-route-helpers";

describe("publish route guard redirects", () => {
  it("falls back to home for publish-only routes when login is missing", () => {
    expect(
      resolveProtectedRouteRedirect({
        location: {
          pathname: APP_ROUTES.publishArticle,
          search: "?edit=post_1",
          hash: "#draft"
        },
        mode: "fallback",
        fallbackPath: APP_ROUTES.feedHome
      })
    ).toBe(APP_ROUTES.feedHome);
  });

  it("keeps login redirects for regular protected pages", () => {
    expect(
      resolveProtectedRouteRedirect({
        location: {
          pathname: APP_ROUTES.webSettings,
          search: "?tab=privacy",
          hash: "#alerts"
        },
        mode: "login",
        fallbackPath: APP_ROUTES.feedHome
      })
    ).toBe("/login?redirect=%2Fsettings%3Ftab%3Dprivacy%23alerts");
  });
});
