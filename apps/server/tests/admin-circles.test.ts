import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { API_ROUTES } from "@feijia/shared";
import {
  adminCirclePostsQuerySchema,
  adminCircleCommentsQuerySchema,
  adminCirclePostStatusInputSchema,
  adminCircleCommentStatusInputSchema,
} from "@feijia/schemas";
import {
  attachCurrentUser,
  requireRole,
} from "../src/modules/auth/auth.middleware";

// ── Mock circlesService ──

const circlesServiceMock = {
  listAllPosts: vi.fn(),
  updatePostStatus: vi.fn(),
  listPostReports: vi.fn(),
  listAllComments: vi.fn(),
  updateCommentStatus: vi.fn(),
  listCommentReports: vi.fn(),
};

vi.mock("../src/modules/circles/circles.service", () => ({
  circlesService: circlesServiceMock,
}));

vi.mock("../src/modules/uploads/uploads.helpers", () => ({
  resolvePublicUploadedFileUrl: vi.fn().mockResolvedValue(null),
  resolveUploadedFileUrl: vi.fn().mockResolvedValue(null),
}));

// ── Mock auth middleware ──

type AuthUser = { id: string; role: string } | null;

let currentUserOverride: AuthUser = null;

vi.mock("../src/modules/auth/auth.middleware", () => ({
  attachCurrentUser: async (c: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
    c.set("currentUser", currentUserOverride);
    await next();
  },
  requireAuth: async (c: { var: { currentUser: AuthUser }; json: (data: unknown, status?: number) => Response }, next: () => Promise<void>) => {
    if (!c.var.currentUser) {
      return c.json({ code: "UNAUTHORIZED", message: "Not authenticated." }, 401);
    }
    await next();
  },
  requireRole: (...allowedRoles: string[]) => {
    return async (c: { var: { currentUser: AuthUser }; json: (data: unknown, status?: number) => Response }, next: () => Promise<void>) => {
      const user = c.var.currentUser;
      if (!user) {
        return c.json({ code: "UNAUTHORIZED", message: "Not authenticated." }, 401);
      }
      const allowed = new Set(["super_admin", "admin", ...allowedRoles]);
      if (!allowed.has(user.role)) {
        return c.json({ code: "FORBIDDEN", message: "Insufficient permissions." }, 403);
      }
      await next();
    };
  },
}));

/**
 * 构建测试用 admin circles 路由应用。
 * 复现 circles.route.ts 中 adminCirclesRoute 的行为，
 * 使用被 mock 的 auth 中间件进行角色保护。
 */
function createAdminTestApp() {
  const app = new Hono();
  app.use("*", attachCurrentUser);

  // GET /api/v1/admin/circles/posts
  app.get(API_ROUTES.adminCircles.posts, requireRole("super_admin", "moderator"), async (c) => {
    const query = adminCirclePostsQuerySchema.parse(c.req.query());
    const posts = await circlesServiceMock.listAllPosts({
      status: query.status,
      circleId: query.circleId,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });
    return c.json({ items: posts });
  });

  // PUT /api/v1/admin/circles/posts/:postId/status
  app.put(API_ROUTES.adminCircles.postStatus(":postId"), requireRole("super_admin", "moderator"), async (c) => {
    const body = adminCirclePostStatusInputSchema.parse(await c.req.json());
    const postId = c.req.param("postId") ?? "";
    const ok = await circlesServiceMock.updatePostStatus(postId, body.status);
    if (!ok) return c.json({ code: "NOT_FOUND", message: "Post not found." }, 404);
    return c.json({ success: true });
  });

  // GET /api/v1/admin/circles/posts/:postId/reports
  app.get(API_ROUTES.adminCircles.postReports(":postId"), requireRole("super_admin", "moderator"), async (c) => {
    const postId2 = c.req.param("postId") ?? "";
    const reports = await circlesServiceMock.listPostReports(postId2);
    return c.json({ items: reports });
  });

  // GET /api/v1/admin/circles/comments
  app.get(API_ROUTES.adminCircles.comments, requireRole("super_admin", "moderator"), async (c) => {
    const query = adminCircleCommentsQuerySchema.parse(c.req.query());
    const comments = await circlesServiceMock.listAllComments({
      status: query.status,
      circleId: query.circleId,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });
    return c.json({ items: comments });
  });

  // PUT /api/v1/admin/circles/comments/:commentId/status
  app.put(API_ROUTES.adminCircles.commentStatus(":commentId"), requireRole("super_admin", "moderator"), async (c) => {
    const body = adminCircleCommentStatusInputSchema.parse(await c.req.json());
    const commentId = c.req.param("commentId") ?? "";
    const ok = await circlesServiceMock.updateCommentStatus(commentId, body.status);
    if (!ok) return c.json({ code: "NOT_FOUND", message: "Comment not found." }, 404);
    return c.json({ success: true });
  });

  // GET /api/v1/admin/circles/comments/:commentId/reports
  app.get(API_ROUTES.adminCircles.commentReports(":commentId"), requireRole("super_admin", "moderator"), async (c) => {
    const commentId2 = c.req.param("commentId") ?? "";
    const reports = await circlesServiceMock.listCommentReports(commentId2);
    return c.json({ items: reports });
  });

  return app;
}

describe("admin circles route — 帖子管理", () => {
  let app: ReturnType<typeof createAdminTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createAdminTestApp();
    currentUserOverride = { id: "admin_1", role: "super_admin" };
  });

  // ── GET /api/v1/admin/circles/posts ──

  describe("GET /api/v1/admin/circles/posts", () => {
    it("返回帖子列表", async () => {
      const mockPosts = [
        { id: "post_1", title: "Test Post", status: "published" },
        { id: "post_2", title: "Hidden Post", status: "hidden" },
      ];
      circlesServiceMock.listAllPosts.mockResolvedValue(mockPosts);

      const response = await app.request(API_ROUTES.adminCircles.posts);

      expect(response.status).toBe(200);
      const body = (await response.json()) as { items: unknown[] };
      expect(body.items).toEqual(mockPosts);
      expect(circlesServiceMock.listAllPosts).toHaveBeenCalledWith({
        status: undefined,
        circleId: undefined,
        limit: 20,
        offset: 0,
      });
    });

    it("按状态筛选帖子", async () => {
      circlesServiceMock.listAllPosts.mockResolvedValue([]);

      await app.request(`${API_ROUTES.adminCircles.posts}?status=hidden`);

      expect(circlesServiceMock.listAllPosts).toHaveBeenCalledWith({
        status: "hidden",
        circleId: undefined,
        limit: 20,
        offset: 0,
      });
    });

    it("按圈子筛选帖子", async () => {
      circlesServiceMock.listAllPosts.mockResolvedValue([]);

      await app.request(`${API_ROUTES.adminCircles.posts}?circleId=circle_1`);

      expect(circlesServiceMock.listAllPosts).toHaveBeenCalledWith({
        status: undefined,
        circleId: "circle_1",
        limit: 20,
        offset: 0,
      });
    });

    it("分页参数正确计算 offset", async () => {
      circlesServiceMock.listAllPosts.mockResolvedValue([]);

      await app.request(`${API_ROUTES.adminCircles.posts}?page=3&limit=10`);

      expect(circlesServiceMock.listAllPosts).toHaveBeenCalledWith({
        status: undefined,
        circleId: undefined,
        limit: 10,
        offset: 20, // (3-1) * 10
      });
    });
  });

  // ── PUT /api/v1/admin/circles/posts/:postId/status ──

  describe("PUT /api/v1/admin/circles/posts/:postId/status", () => {
    it("修改帖子状态成功", async () => {
      circlesServiceMock.updatePostStatus.mockResolvedValue(true);

      const response = await app.request(
        API_ROUTES.adminCircles.postStatus("post_1"),
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "hidden" }),
        }
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { success: boolean };
      expect(body.success).toBe(true);
      expect(circlesServiceMock.updatePostStatus).toHaveBeenCalledWith("post_1", "hidden");
    });

    it("帖子不存在返回 404", async () => {
      circlesServiceMock.updatePostStatus.mockResolvedValue(false);

      const response = await app.request(
        API_ROUTES.adminCircles.postStatus("nonexistent"),
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "deleted" }),
        }
      );

      expect(response.status).toBe(404);
      const body = (await response.json()) as { code: string };
      expect(body.code).toBe("NOT_FOUND");
    });

    it("无效状态值导致 schema 验证失败", async () => {
      const response = await app.request(
        API_ROUTES.adminCircles.postStatus("post_1"),
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "invalid_status" }),
        }
      );

      // Zod parse 会抛出错误，Hono 默认返回 500
      expect(response.status).not.toBe(200);
      expect(circlesServiceMock.updatePostStatus).not.toHaveBeenCalled();
    });
  });

  // ── GET /api/v1/admin/circles/posts/:postId/reports ──

  describe("GET /api/v1/admin/circles/posts/:postId/reports", () => {
    it("返回帖子举报列表", async () => {
      const mockReports = [
        { id: "report_1", reason: "spam", reporter: { id: "user_1", displayName: "User" } },
      ];
      circlesServiceMock.listPostReports.mockResolvedValue(mockReports);

      const response = await app.request(
        API_ROUTES.adminCircles.postReports("post_1")
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { items: unknown[] };
      expect(body.items).toEqual(mockReports);
      expect(circlesServiceMock.listPostReports).toHaveBeenCalledWith("post_1");
    });
  });
});

describe("admin circles route — 评论管理", () => {
  let app: ReturnType<typeof createAdminTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createAdminTestApp();
    currentUserOverride = { id: "admin_1", role: "super_admin" };
  });

  // ── GET /api/v1/admin/circles/comments ──

  describe("GET /api/v1/admin/circles/comments", () => {
    it("返回评论列表", async () => {
      const mockComments = [
        { id: "comment_1", content: "Nice post", status: "visible" },
      ];
      circlesServiceMock.listAllComments.mockResolvedValue(mockComments);

      const response = await app.request(API_ROUTES.adminCircles.comments);

      expect(response.status).toBe(200);
      const body = (await response.json()) as { items: unknown[] };
      expect(body.items).toEqual(mockComments);
      expect(circlesServiceMock.listAllComments).toHaveBeenCalledWith({
        status: undefined,
        circleId: undefined,
        limit: 20,
        offset: 0,
      });
    });

    it("按状态筛选评论", async () => {
      circlesServiceMock.listAllComments.mockResolvedValue([]);

      await app.request(`${API_ROUTES.adminCircles.comments}?status=hidden`);

      expect(circlesServiceMock.listAllComments).toHaveBeenCalledWith({
        status: "hidden",
        circleId: undefined,
        limit: 20,
        offset: 0,
      });
    });

    it("按圈子筛选评论", async () => {
      circlesServiceMock.listAllComments.mockResolvedValue([]);

      await app.request(`${API_ROUTES.adminCircles.comments}?circleId=circle_1`);

      expect(circlesServiceMock.listAllComments).toHaveBeenCalledWith({
        status: undefined,
        circleId: "circle_1",
        limit: 20,
        offset: 0,
      });
    });
  });

  // ── PUT /api/v1/admin/circles/comments/:commentId/status ──

  describe("PUT /api/v1/admin/circles/comments/:commentId/status", () => {
    it("修改评论状态成功", async () => {
      circlesServiceMock.updateCommentStatus.mockResolvedValue(true);

      const response = await app.request(
        API_ROUTES.adminCircles.commentStatus("comment_1"),
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "hidden" }),
        }
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { success: boolean };
      expect(body.success).toBe(true);
      expect(circlesServiceMock.updateCommentStatus).toHaveBeenCalledWith("comment_1", "hidden");
    });

    it("评论不存在返回 404", async () => {
      circlesServiceMock.updateCommentStatus.mockResolvedValue(false);

      const response = await app.request(
        API_ROUTES.adminCircles.commentStatus("nonexistent"),
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "visible" }),
        }
      );

      expect(response.status).toBe(404);
      const body = (await response.json()) as { code: string };
      expect(body.code).toBe("NOT_FOUND");
    });
  });

  // ── GET /api/v1/admin/circles/comments/:commentId/reports ──

  describe("GET /api/v1/admin/circles/comments/:commentId/reports", () => {
    it("返回评论举报列表", async () => {
      const mockReports = [
        { id: "report_2", reason: "abuse", reporter: { id: "user_2", displayName: "Reporter" } },
      ];
      circlesServiceMock.listCommentReports.mockResolvedValue(mockReports);

      const response = await app.request(
        API_ROUTES.adminCircles.commentReports("comment_1")
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { items: unknown[] };
      expect(body.items).toEqual(mockReports);
      expect(circlesServiceMock.listCommentReports).toHaveBeenCalledWith("comment_1");
    });
  });
});

describe("admin circles route — 角色保护", () => {
  let app: ReturnType<typeof createAdminTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createAdminTestApp();
  });

  const adminEndpoints: Array<{
    name: string;
    method: string;
    path: string;
    body?: string;
  }> = [
    {
      name: "GET /admin/circles/posts",
      method: "GET",
      path: API_ROUTES.adminCircles.posts,
    },
    {
      name: "PUT /admin/circles/posts/:postId/status",
      method: "PUT",
      path: API_ROUTES.adminCircles.postStatus("post_1"),
      body: JSON.stringify({ status: "hidden" }),
    },
    {
      name: "GET /admin/circles/posts/:postId/reports",
      method: "GET",
      path: API_ROUTES.adminCircles.postReports("post_1"),
    },
    {
      name: "GET /admin/circles/comments",
      method: "GET",
      path: API_ROUTES.adminCircles.comments,
    },
    {
      name: "PUT /admin/circles/comments/:commentId/status",
      method: "PUT",
      path: API_ROUTES.adminCircles.commentStatus("comment_1"),
      body: JSON.stringify({ status: "hidden" }),
    },
    {
      name: "GET /admin/circles/comments/:commentId/reports",
      method: "GET",
      path: API_ROUTES.adminCircles.commentReports("comment_1"),
    },
  ];

  for (const endpoint of adminEndpoints) {
    it(`${endpoint.name} — 未登录返回 401`, async () => {
      currentUserOverride = null;

      const response = await app.request(endpoint.path, {
        method: endpoint.method,
        headers: endpoint.body ? { "content-type": "application/json" } : undefined,
        body: endpoint.body,
      });

      expect(response.status).toBe(401);
    });

    it(`${endpoint.name} — 普通用户返回 403`, async () => {
      currentUserOverride = { id: "user_1", role: "user" };

      const response = await app.request(endpoint.path, {
        method: endpoint.method,
        headers: endpoint.body ? { "content-type": "application/json" } : undefined,
        body: endpoint.body,
      });

      expect(response.status).toBe(403);
    });

    it(`${endpoint.name} — super_admin 有权访问`, async () => {
      currentUserOverride = { id: "admin_1", role: "super_admin" };
      // 设置必要的 mock 返回值
      circlesServiceMock.listAllPosts.mockResolvedValue([]);
      circlesServiceMock.updatePostStatus.mockResolvedValue(true);
      circlesServiceMock.listPostReports.mockResolvedValue([]);
      circlesServiceMock.listAllComments.mockResolvedValue([]);
      circlesServiceMock.updateCommentStatus.mockResolvedValue(true);
      circlesServiceMock.listCommentReports.mockResolvedValue([]);

      const response = await app.request(endpoint.path, {
        method: endpoint.method,
        headers: endpoint.body ? { "content-type": "application/json" } : undefined,
        body: endpoint.body,
      });

      expect(response.status).toBe(200);
    });

    it(`${endpoint.name} — moderator 有权访问`, async () => {
      currentUserOverride = { id: "mod_1", role: "moderator" };
      circlesServiceMock.listAllPosts.mockResolvedValue([]);
      circlesServiceMock.updatePostStatus.mockResolvedValue(true);
      circlesServiceMock.listPostReports.mockResolvedValue([]);
      circlesServiceMock.listAllComments.mockResolvedValue([]);
      circlesServiceMock.updateCommentStatus.mockResolvedValue(true);
      circlesServiceMock.listCommentReports.mockResolvedValue([]);

      const response = await app.request(endpoint.path, {
        method: endpoint.method,
        headers: endpoint.body ? { "content-type": "application/json" } : undefined,
        body: endpoint.body,
      });

      expect(response.status).toBe(200);
    });
  }
});

describe("admin circles route — API_ROUTES 常量验证", () => {
  it("adminCircles 路由常量完整定义", () => {
    expect(API_ROUTES.adminCircles.posts).toBe("/api/v1/admin/circles/posts");
    expect(API_ROUTES.adminCircles.postStatus("post_1")).toBe("/api/v1/admin/circles/posts/post_1/status");
    expect(API_ROUTES.adminCircles.postReports("post_1")).toBe("/api/v1/admin/circles/posts/post_1/reports");
    expect(API_ROUTES.adminCircles.comments).toBe("/api/v1/admin/circles/comments");
    expect(API_ROUTES.adminCircles.commentStatus("comment_1")).toBe("/api/v1/admin/circles/comments/comment_1/status");
    expect(API_ROUTES.adminCircles.commentReports("comment_1")).toBe("/api/v1/admin/circles/comments/comment_1/reports");
  });
});

describe("admin circles schema — 输入验证", () => {
  it("adminCirclePostStatusInputSchema 接受有效状态", () => {
    expect(adminCirclePostStatusInputSchema.parse({ status: "published" })).toEqual({ status: "published" });
    expect(adminCirclePostStatusInputSchema.parse({ status: "hidden" })).toEqual({ status: "hidden" });
    expect(adminCirclePostStatusInputSchema.parse({ status: "deleted" })).toEqual({ status: "deleted" });
  });

  it("adminCirclePostStatusInputSchema 拒绝无效状态", () => {
    expect(() => adminCirclePostStatusInputSchema.parse({ status: "invalid" })).toThrow();
    expect(() => adminCirclePostStatusInputSchema.parse({})).toThrow();
  });

  it("adminCircleCommentStatusInputSchema 接受有效状态", () => {
    expect(adminCircleCommentStatusInputSchema.parse({ status: "visible" })).toEqual({ status: "visible" });
    expect(adminCircleCommentStatusInputSchema.parse({ status: "hidden" })).toEqual({ status: "hidden" });
  });

  it("adminCircleCommentStatusInputSchema 拒绝无效状态", () => {
    expect(() => adminCircleCommentStatusInputSchema.parse({ status: "deleted" })).toThrow();
    expect(() => adminCircleCommentStatusInputSchema.parse({})).toThrow();
  });

  it("adminCirclePostsQuerySchema 默认值正确", () => {
    const result = adminCirclePostsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.status).toBeUndefined();
    expect(result.circleId).toBeUndefined();
  });

  it("adminCircleCommentsQuerySchema 默认值正确", () => {
    const result = adminCircleCommentsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.status).toBeUndefined();
    expect(result.circleId).toBeUndefined();
  });
});
