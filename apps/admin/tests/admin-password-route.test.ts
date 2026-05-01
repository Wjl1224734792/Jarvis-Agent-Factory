import { describe, expect, it } from "vitest";
import { getActiveAdminNavItemPaths } from "../src/features/auth/admin-navigation";
import { ADMIN_ROUTE_PATHS } from "../src/lib/admin-routes";

describe("admin security navigation", () => {
  it("marks the security settings page as an active management nav item", () => {
    expect(getActiveAdminNavItemPaths(ADMIN_ROUTE_PATHS.managementSecurity)).toEqual([
      ADMIN_ROUTE_PATHS.managementSecurity
    ]);
  });

  it("marks the users page as an active management nav item", () => {
    expect(getActiveAdminNavItemPaths(ADMIN_ROUTE_PATHS.managementUsers)).toEqual([
      ADMIN_ROUTE_PATHS.managementUsers
    ]);
  });
});
