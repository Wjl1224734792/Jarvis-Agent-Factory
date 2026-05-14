import { z } from "zod";

/** AI 摘要请求体 */
export const aiSummaryRequestSchema = z.object({
  postId: z.string().min(1),
  content: z.string().optional()
});

/** AI 摘要响应体 */
export const aiSummaryResponseSchema = z.object({
  summary: z.string(),
  cached: z.boolean()
});

/** AI 排版请求体 */
export const aiFormatRequestSchema = z.object({
  content: z.string().min(1).max(8000),
  mode: z.enum(["beautify", "structure"])
});

/** AI 排版响应体 */
export const aiFormatResponseSchema = z.object({
  html: z.string(),
  changes: z.array(z.string())
});

/** AI 聊天请求体 */
export const aiChatRequestSchema = z.object({
  message: z.string().min(1).max(500),
  context: z.string().max(8000).optional(),
  title: z.string().max(64).optional()
});

/** AI 聊天响应体 */
export const aiChatResponseSchema = z.object({
  reply: z.string()
});

/** AI 功能开关配置 */
const aiFeaturesSchema = z.object({
  summary: z.boolean(),
  format: z.boolean(),
  chat: z.boolean()
});

/** AI 设置（写入 / 更新用） */
export const aiSettingsSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
  summaryModel: z.string().min(1),
  formatModel: z.string().min(1),
  features: aiFeaturesSchema
});

/** AI 设置响应体（apiKey 脱敏） */
export const aiSettingsResponseSchema = z.object({
  provider: z.string(),
  apiKey: z.string(),
  baseUrl: z.string(),
  summaryModel: z.string(),
  formatModel: z.string(),
  features: aiFeaturesSchema
});

export type AiSummaryRequest = z.infer<typeof aiSummaryRequestSchema>;
export type AiSummaryResponse = z.infer<typeof aiSummaryResponseSchema>;
export type AiFormatRequest = z.infer<typeof aiFormatRequestSchema>;
export type AiFormatResponse = z.infer<typeof aiFormatResponseSchema>;
export type AiChatRequest = z.infer<typeof aiChatRequestSchema>;
export type AiChatResponse = z.infer<typeof aiChatResponseSchema>;
export type AiSettings = z.infer<typeof aiSettingsSchema>;
export type AiSettingsResponse = z.infer<typeof aiSettingsResponseSchema>;
