import { describe, expect, it } from "vitest";
import { API_ROUTES, API_V1_PREFIX, withApiV1Prefix } from "../src";

describe("API route versioning", () => {
  it("prefixes business APIs with the stable v1 namespace", () => {
    expect(API_ROUTES.auth.webLogin).toBe(`${API_V1_PREFIX}/auth/web/login`);
    expect(API_ROUTES.feed).toBe(`${API_V1_PREFIX}/home/feed`);
    expect(API_ROUTES.posts.detail("post_1")).toBe(`${API_V1_PREFIX}/posts/post_1`);
    expect(API_ROUTES.rankings.adminStatus("ranking_1")).toBe(
      `${API_V1_PREFIX}/admin/rankings/ranking_1/status`
    );
    expect(API_ROUTES.admin.users).toBe(`${API_V1_PREFIX}/admin/users`);
    expect(API_ROUTES.admin.userDetail("user_1")).toBe(`${API_V1_PREFIX}/admin/users/user_1`);
    expect(API_ROUTES.admin.userBan("user_1")).toBe(`${API_V1_PREFIX}/admin/users/user_1/ban`);
    expect(API_ROUTES.admin.userUnban("user_1")).toBe(`${API_V1_PREFIX}/admin/users/user_1/unban`);
  });

  it("keeps health checks stable at the root while helper-normalizing prefixed paths", () => {
    expect(API_ROUTES.health).toBe("/health");
    expect(withApiV1Prefix("auth/web/refresh")).toBe(`${API_V1_PREFIX}/auth/web/refresh`);
    expect(withApiV1Prefix("/admin/messages")).toBe(`${API_V1_PREFIX}/admin/messages`);
  });
});
