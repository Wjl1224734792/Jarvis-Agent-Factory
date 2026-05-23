import { z } from "zod";

/** 用户所属圈子信息 —— 匹配 GET /api/v1/circles?userId=xxx 返回的 items 元素 */
export const userCircleSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  joinMode: z.string(),
  memberCount: z.number(),
  postCount: z.number(),
  role: z.string().nullable(),
  joinedAt: z.string(),
});

export type UserCircle = z.infer<typeof userCircleSchema>;
