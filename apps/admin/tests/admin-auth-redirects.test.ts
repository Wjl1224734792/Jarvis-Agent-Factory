import { describe, expect, it } from "vitest";
import {
  APP_ROUTES,
  buildLoginRedirectUrl,
  resolveSafeRedirectPath
} from "@feijia/shared";

describe("admin auth redirect helpers", () => {
  it("keeps query and hash when redirecting admins to login", () => {
    expect(
      buildLoginRedirectUrl(APP_ROUTES.adminLogin, {
        pathname: APP_ROUTES.adminPosts,
        search: "?status=pending",
        hash: "#filters"
      })
    ).toBe("/admin/login?redirect=%2Fadmin%2Fposts%3Fstatus%3Dpending%23filters");
  });

  it("falls back to the admin home route for invalid redirect targets", () => {
    expect(
      resolveSafeRedirectPath({
        candidate: "",
        fallbackPath: APP_ROUTES.adminHome,
        blockedPaths: [APP_ROUTES.adminLogin]
      })
    ).toBe(APP_ROUTES.adminHome);

    expect(
      resolveSafeRedirectPath({
        candidate: "//evil.example.com",
        fallbackPath: APP_ROUTES.adminHome,
        blockedPaths: [APP_ROUTES.adminLogin]
      })
    ).toBe(APP_ROUTES.adminHome);
  });
});
