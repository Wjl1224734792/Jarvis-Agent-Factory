import { z } from "zod";

import { chinaMainlandMobilePhoneSchema } from "./phone";

export const authRoleSchema = z.enum(["user", "admin"]);

/**
 * 后台管理角色枚举（含兼容别名 admin）。
 * 用于 requireRole 中间件和权限矩阵，不替换基础 authRoleSchema。
 */
export type AdminRole = "admin" | "super_admin" | "editor" | "moderator" | "operator";

/** 管理员类角色列表（含兼容别名 admin） */
export const ADMIN_ROLES: readonly AdminRole[] = [
  "admin",
  "super_admin",
  "editor",
  "moderator",
  "operator"
];

/**
 * 各角色对应的权限列表
 * - "super_admin" 拥有通配符 "*" 表示全部权限
 * - "admin" 作为兼容别名，权限与 super_admin 相同
 * - 其他角色按 module:* 格式声明模块级权限
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  admin: ["*"],
  editor: [
    "content:*",
    "circles:manage",
    "overview:view",
    "messages:view",
    "settings:security",
    "settings:recommendation",
  ],
  moderator: [
    "moderation:*",
    "circles:moderate",
    "overview:view",
    "messages:view",
    "settings:security",
  ],
  operator: [
    "operations:*",
    "circles:manage",
    "overview:view",
    "messages:view",
    "settings:security",
    "settings:recommendation",
  ],
};

export const passwordPolicyDescription =
  "Password must be 8-100 characters and include uppercase, lowercase and special characters.";

export const strongPasswordSchema = z
  .string()
  .min(8, passwordPolicyDescription)
  .max(100, "Password must be at most 100 characters.")
  .refine((value) => /[a-z]/.test(value), passwordPolicyDescription)
  .refine((value) => /[A-Z]/.test(value), passwordPolicyDescription)
  .refine((value) => /[^A-Za-z0-9]/.test(value), passwordPolicyDescription);

export const authErrorCodeSchema = z.enum([
  "INVALID_CAPTCHA",
  "INVALID_SMS_CODE",
  "INVALID_CREDENTIALS",
  "INVALID_REFRESH_TOKEN",
  "SMS_PROVIDER_UNAVAILABLE",
  "SMS_RATE_LIMITED",
  "RATE_LIMITED",
  "SESSION_EXPIRED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "DISPLAY_NAME_TAKEN",
  "PHONE_ALREADY_REGISTERED",
  "REGISTRATION_REQUIRED",
  "INVALID_REGISTRATION_TOKEN",
  "TOKEN_EXPIRED",
  "ADMIN_ACCOUNT_LOCKED",
  "USER_BANNED"
]);

export const userSummarySchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().trim().min(1).nullable().default(null),
  ipLocationLabel: z.string().trim().min(1).nullable().default(null),
  role: authRoleSchema
});

export const currentUserResponseSchema = z.object({
  user: userSummarySchema.nullable()
});

export const captchaChallengeResponseSchema = z.object({
  challengeId: z.string().min(1),
  /** SVG 片段字符串，供前端直接插入 DOM 展示（不含答案明文） */
  imageOrText: z.string().min(1),
  expiresInSeconds: z.number().int().positive()
});

export const smsCodeRequestSchema = z.object({
  phone: chinaMainlandMobilePhoneSchema,
  captchaChallengeId: z.string().min(1),
  captchaCode: z.string().min(4).max(8)
});

export const smsCodeResponseSchema = z.object({
  requestId: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
  mockCode: z.string().regex(/^\d{6,8}$/).optional()
});

const smsLoginCredentialsSchema = z.object({
  phone: chinaMainlandMobilePhoneSchema,
  smsCode: z.string().regex(/^\d{6,8}$/)
});

export const webSmsLoginRequestSchema = smsLoginCredentialsSchema.extend({
  method: z.literal("sms")
});

export const webPasswordLoginRequestSchema = z.object({
  method: z.literal("password"),
  phone: z.string().min(2).max(100),
  password: z.string().min(1).max(100),
  captchaChallengeId: z.string().min(1),
  captchaCode: z.string().min(4).max(8)
});

export const webLoginRequestSchema = z.preprocess(
  (value) =>
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !("method" in value)
      ? { ...value, method: "sms" }
      : value,
  z.discriminatedUnion("method", [
    webSmsLoginRequestSchema,
    webPasswordLoginRequestSchema
  ])
);

const deviceLabelSchema = z.string().trim().min(1).max(120);
const deviceTypeSchema = z.enum([
  "ios",
  "android",
  "harmony",
  "miniapp-wechat",
  "web"
]);

export const webLoginSuccessResponseSchema = z.object({
  kind: z.literal("authenticated"),
  user: userSummarySchema
});

export const webLoginRegistrationRequiredResponseSchema = z.object({
  kind: z.literal("registration_required"),
  registrationToken: z.string().min(1),
  phone: chinaMainlandMobilePhoneSchema,
  suggestedDisplayName: z.string().trim().min(1).max(50)
});

export const webLoginResponseSchema = z.discriminatedUnion("kind", [
  webLoginSuccessResponseSchema,
  webLoginRegistrationRequiredResponseSchema
]);

export const appLoginRequestSchema = smsLoginCredentialsSchema.extend({
  deviceLabel: deviceLabelSchema.optional().nullable(),
  deviceType: deviceTypeSchema.optional(),
  pushToken: z.string().trim().min(1).max(255).optional().nullable()
});

const appAuthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1)
});

export const appLoginSuccessResponseSchema = appAuthTokensSchema.extend({
  kind: z.literal("authenticated"),
  user: userSummarySchema
});

export const appLoginResponseSchema = z.discriminatedUnion("kind", [
  appLoginSuccessResponseSchema,
  webLoginRegistrationRequiredResponseSchema
]);

export const completeWebRegistrationRequestSchema = z.object({
  registrationToken: z.string().min(1),
  displayName: z.string().trim().min(1).max(50),
  avatarFileId: z.string().trim().min(1).nullable().optional()
});

export const registrationDisplayNameSuggestRequestSchema = z.object({
  registrationToken: z.string().min(1)
});

export const registrationDisplayNameSuggestResponseSchema = z.object({
  displayName: z.string().trim().min(1).max(50)
});

export const completeAppRegistrationRequestSchema = completeWebRegistrationRequestSchema.extend({
  deviceLabel: deviceLabelSchema.optional().nullable(),
  deviceType: deviceTypeSchema.optional(),
  pushToken: z.string().trim().min(1).max(255).optional().nullable()
});

export const appAuthSessionResponseSchema = appAuthTokensSchema.extend({
  user: userSummarySchema
});

export const appRefreshRequestSchema = z.object({
  refreshToken: z.string().min(1)
});

export const adminLoginRequestSchema = z.object({
  account: z.string().min(3),
  password: z.string().min(1).max(100),
  captchaChallengeId: z.string().min(1),
  captchaCode: z.string().min(4).max(8)
});

const passwordChangeRequestSchema = z
  .object({
    currentPassword: z.string().min(1).max(100),
    newPassword: strongPasswordSchema
  })
  .refine((input) => input.currentPassword !== input.newPassword, {
    message: "新密码不能与当前密码相同",
    path: ["newPassword"]
  });

export const adminPasswordChangeRequestSchema = passwordChangeRequestSchema;
export const userPasswordChangeRequestSchema = z
  .object({
    currentPassword: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(1).max(100).optional()
    ),
    newPassword: strongPasswordSchema,
    smsRequestId: z.string().min(1),
    smsCode: z.string().regex(/^\d{6,8}$/)
  })
  .refine(
    (input) =>
      input.currentPassword == null || input.currentPassword !== input.newPassword,
    {
      message: "新密码不能与当前密码相同",
      path: ["newPassword"]
    }
  );

export const authSuccessResponseSchema = z.object({
  user: userSummarySchema
});

export const adminRecentSessionSchema = z.object({
  id: z.string().min(1),
  scope: z.enum(["web", "admin", "app"]),
  clientIp: z.string().trim().min(1).nullable(),
  userAgent: z.string().trim().min(1).nullable(),
  deviceLabel: z.string().trim().min(1).nullable(),
  status: z.enum(["active", "revoked", "expired"]),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime(),
  user: z.object({
    id: z.string().min(1),
    displayName: z.string().min(1),
    role: authRoleSchema,
    phone: z.string().trim().min(1).nullable()
  })
});

export const adminRecentSessionsResponseSchema = z.object({
  items: z.array(adminRecentSessionSchema)
});

export const authErrorResponseSchema = z.object({
  code: authErrorCodeSchema,
  message: z.string().min(1)
});

export type AuthRole = z.infer<typeof authRoleSchema>;
export type UserSummary = z.infer<typeof userSummarySchema>;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().nonnegative()
});

// ---------------------------------------------------------------------------
// Device registration
// ---------------------------------------------------------------------------

export const deviceRegisterInputSchema = z.object({
  deviceType: deviceTypeSchema,
  deviceLabel: deviceLabelSchema.optional().nullable(),
  pushToken: z.string().trim().min(1).max(255)
});

export const deviceRegisterResponseSchema = z.object({
  deviceId: z.string().min(1),
  registeredAt: z.string().datetime()
});

export const deviceUnregisterInputSchema = z.object({
  pushToken: z.string().trim().min(1).max(255).optional()
});
