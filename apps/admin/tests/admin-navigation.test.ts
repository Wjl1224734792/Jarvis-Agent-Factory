import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "@feijia/shared";
import {
  ADMIN_NAV_ITEMS,
  getActiveAdminNavItemPaths,
  getAdminNavGroupKey,
  getAdminNavigationState
} from "../src/features/auth/admin-navigation";
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

  it("resolves menu selection and open group for canonical and alias routes", () => {
    const overviewGroup = ADMIN_NAV_ITEMS.find((item) => item.to === ADMIN_ROUTE_PATHS.overview)?.group;
    const moderationGroup = ADMIN_NAV_ITEMS.find(
      (item) => item.to === ADMIN_ROUTE_PATHS.moderationArticles
    )?.group;
    const operationsGroup = ADMIN_NAV_ITEMS.find(
      (item) => item.to === ADMIN_ROUTE_PATHS.operationsRankings
    )?.group;

    expect(overviewGroup).toBeDefined();
    expect(moderationGroup).toBeDefined();
    expect(operationsGroup).toBeDefined();

    expect(getAdminNavigationState(APP_ROUTES.adminHome)).toMatchObject({
      selectedKeys: [ADMIN_ROUTE_PATHS.overview],
      openKeys: [getAdminNavGroupKey(overviewGroup as (typeof ADMIN_NAV_ITEMS)[number]["group"])]
    });

    expect(getAdminNavigationState(APP_ROUTES.adminPosts)).toMatchObject({
      selectedKeys: [ADMIN_ROUTE_PATHS.moderationArticles],
      openKeys: [
        getAdminNavGroupKey(moderationGroup as (typeof ADMIN_NAV_ITEMS)[number]["group"])
      ]
    });

    expect(getAdminNavigationState(`${APP_ROUTES.adminRankings}/new`)).toMatchObject({
      selectedKeys: [ADMIN_ROUTE_PATHS.operationsRankings],
      openKeys: [
        getAdminNavGroupKey(operationsGroup as (typeof ADMIN_NAV_ITEMS)[number]["group"])
      ]
    });
  });
});
