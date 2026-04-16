import { z } from "zod";

import { chinaMainlandMobilePhoneSchema } from "./phone";

export const authRoleSchema = z.enum(["user", "admin"]);

export const authErrorCodeSchema = z.enum([
  "INVALID_CAPTCHA",
  "INVALID_SMS_CODE",
  "INVALID_CREDENTIALS",
  "INVALID_REFRESH_TOKEN",
  "SMS_PROVIDER_UNAVAILABLE",
  "SMS_RATE_LIMITED",
  "SESSION_EXPIRED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "DISPLAY_NAME_TAKEN",
  "PHONE_ALREADY_REGISTERED",
  "REGISTRATION_REQUIRED",
  "INVALID_REGISTRATION_TOKEN",
  "TOKEN_EXPIRED",
  "ADMIN_ACCOUNT_LOCKED"
]);

export const userSummarySchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().trim().min(1).nullable().default(null),
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
  mockCode: z.string().length(6).optional()
});

export const webLoginRequestSchema = z.object({
  phone: chinaMainlandMobilePhoneSchema,
  captchaChallengeId: z.string().min(1),
  captchaCode: z.string().min(4).max(8),
  smsCode: z.string().length(6)
});

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

export const appLoginRequestSchema = webLoginRequestSchema.extend({
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
  password: z.string().min(8)
});

export const adminPasswordChangeRequestSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8).max(100)
  })
  .refine((input) => input.currentPassword !== input.newPassword, {
    message: "新密码不能与当前密码相同",
    path: ["newPassword"]
  });

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
