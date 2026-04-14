import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "@feijia/shared";
import { ADMIN_NAV_ITEMS, getActiveAdminNavItemPaths } from "../src/features/auth/admin-navigation";
import { ADMIN_ROUTE_PATHS } from "../src/lib/admin-routes";

describe("getActiveAdminNavItemPaths", () => {
  it("keeps only the overview item active on the admin home route", () => {
    expect(getActiveAdminNavItemPaths(APP_ROUTES.adminHome)).toEqual([ADMIN_ROUTE_PATHS.overview]);
  });

  it("does not keep the overview item active for child admin routes", () => {
    expect(getActiveAdminNavItemPaths(APP_ROUTES.adminPosts)).toEqual([
      ADMIN_ROUTE_PATHS.moderationArticles
    ]);
    expect(getActiveAdminNavItemPaths(ADMIN_ROUTE_PATHS.logs)).toEqual([ADMIN_ROUTE_PATHS.logs]);
    expect(getActiveAdminNavItemPaths(`${APP_ROUTES.adminRankings}/new`)).toEqual([
      ADMIN_ROUTE_PATHS.operationsRankings
    ]);
  });

  it("never returns more than one active nav item for known routes", () => {
    for (const item of ADMIN_NAV_ITEMS) {
      const activePaths = getActiveAdminNavItemPaths(item.to);
      expect(activePaths).toHaveLength(1);
    }
  });
});
