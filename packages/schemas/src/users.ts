import { z } from "zod";
import {
  paginationMetaSchema,
  paginationQuerySchema
} from "./auth";

export const userStatusSchema = z.enum(["active", "banned"]);
export const adminUserStatusFilterSchema = z.enum(["all", "active", "banned"]).default("all");

/** 数据库用户角色枚举（含管理员扩展角色） */
export const adminUserRoleSchema = z.enum(["user", "admin", "super_admin", "editor", "moderator", "operator"]);
export const adminUserRoleFilterSchema = z.enum(["all", "user", "admin", "super_admin", "editor", "moderator", "operator"]).default("all");

export const adminUserListQuerySchema = paginationQuerySchema.extend({
  keyword: z.string().trim().max(100).optional(),
  status: adminUserStatusFilterSchema,
  role: adminUserRoleFilterSchema
});

export const adminBanUserInputSchema = z.object({
  reason: z.string().trim().min(1).max(300),
  bannedUntil: z.string().datetime().nullable().optional()
});

export const adminUserContentCountsSchema = z.object({
  posts: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  reviews: z.number().int().nonnegative(),
  rankings: z.number().int().nonnegative(),
  aircraftSubmissions: z.number().int().nonnegative(),
  brandApplications: z.number().int().nonnegative()
});

export const adminUserListItemSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().trim().min(1),
  avatarUrl: z.string().trim().min(1).nullable(),
  role: adminUserRoleSchema,
  status: userStatusSchema,
  phone: z.string().trim().min(1).nullable(),
  phoneMasked: z.string().trim().min(1).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  bannedAt: z.string().datetime().nullable(),
  bannedUntil: z.string().datetime().nullable(),
  banReason: z.string().trim().min(1).nullable(),
  bannedBy: z
    .object({
      id: z.string().min(1),
      displayName: z.string().trim().min(1)
    })
    .nullable(),
  lastSeenAt: z.string().datetime().nullable(),
  activeSessionCount: z.number().int().nonnegative(),
  contentCounts: adminUserContentCountsSchema
});

export const adminUserSessionSchema = z.object({
  id: z.string().min(1),
  scope: z.enum(["web", "admin", "app"]),
  clientIp: z.string().trim().min(1).nullable(),
  userAgent: z.string().trim().min(1).nullable(),
  deviceLabel: z.string().trim().min(1).nullable(),
  status: z.enum(["active", "revoked", "expired"]),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime()
});

export const adminUserDetailSchema = adminUserListItemSchema.extend({
  recentSessions: z.array(adminUserSessionSchema)
});

export const adminUsersResponseSchema = z.object({
  items: z.array(adminUserListItemSchema),
  meta: paginationMetaSchema
});

export const adminUserResponseSchema = z.object({
  item: adminUserDetailSchema
});

export type UserStatus = z.infer<typeof userStatusSchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminBanUserInput = z.infer<typeof adminBanUserInputSchema>;
export type AdminUserListItem = z.infer<typeof adminUserListItemSchema>;
export type AdminUserDetail = z.infer<typeof adminUserDetailSchema>;
