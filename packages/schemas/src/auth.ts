import { z } from "zod";

export const authRoleSchema = z.enum(["user", "admin"]);

export const authErrorCodeSchema = z.enum([
  "INVALID_CAPTCHA",
  "INVALID_SMS_CODE",
  "INVALID_CREDENTIALS",
  "SESSION_EXPIRED",
  "UNAUTHORIZED",
  "FORBIDDEN"
]);

export const userSummarySchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  role: authRoleSchema
});

export const currentUserResponseSchema = z.object({
  user: userSummarySchema.nullable()
});

export const captchaChallengeResponseSchema = z.object({
  challengeId: z.string().min(1),
  imageOrText: z.string().min(1),
  expiresInSeconds: z.number().int().positive()
});

export const smsCodeRequestSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/),
  captchaChallengeId: z.string().min(1),
  captchaCode: z.string().min(4).max(8)
});

export const smsCodeResponseSchema = z.object({
  requestId: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
  mockCode: z.string().length(6).optional()
});

export const webLoginRequestSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/),
  captchaChallengeId: z.string().min(1),
  captchaCode: z.string().min(4).max(8),
  smsCode: z.string().length(6)
});

export const adminLoginRequestSchema = z.object({
  account: z.string().min(3),
  password: z.string().min(8)
});

export const authSuccessResponseSchema = z.object({
  user: userSummarySchema
});

export const authErrorResponseSchema = z.object({
  code: authErrorCodeSchema,
  message: z.string().min(1)
});

export type AuthRole = z.infer<typeof authRoleSchema>;
export type UserSummary = z.infer<typeof userSummarySchema>;
