import { z } from "zod";
import { userSummarySchema } from "./auth";
import { contentCategorySchema } from "./content-categories";
import {
  postFeedItemSchema,
  feedTabSchema,
} from "./posts";
import { aircraftCategorySchema, brandSchema } from "./models";

// ── 内容类型枚举 ──

export const homeFeedContentTypeSchema = z.enum([
  "all",
  "article",
  "moment",
  "circle_post",
  "model",
  "ranking",
]);

// ── 圈子帖子 Feed 项 ──

export const circlePostFeedItemSchema = z.object({
  kind: z.literal("circle_post"),
  id: z.string().min(1),
  title: z.string().min(1),
  contentPreview: z.string(),
  circle: z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1),
  }),
  coverImageUrl: z.string().min(1).nullable().default(null),
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  viewCount: z.number().int().nonnegative().default(0),
  author: userSummarySchema,
  createdAt: z.string().datetime(),
});

// ── 机型 Feed 项 ──

export const modelFeedItemSchema = z.object({
  kind: z.literal("model"),
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().nullable(),
  priceMin: z.number().int().nonnegative().nullable(),
  priceMax: z.number().int().nonnegative().nullable(),
  powerType: z.string(),
  favoriteCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  viewCount: z.number().int().nonnegative().default(0),
  category: aircraftCategorySchema.pick({ id: true, slug: true, name: true }),
  brand: brandSchema.pick({ id: true, slug: true, name: true, logoUrl: true }),
  coverImageUrl: z.string().min(1).nullable().default(null),
  maxFlightTimeMinutes: z.number().nonnegative().nullable(),
  maxSpeedKph: z.number().nonnegative().nullable(),
  createdAt: z.string().datetime(),
});

// ── 榜单 Feed 项 ──

export const rankingFeedItemSchema = z.object({
  kind: z.literal("ranking"),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  coverImageUrl: z.string().min(1).nullable().default(null),
  itemCount: z.number().int().nonnegative(),
  viewCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ── 文章 Feed 项（复用已有 schema，加 kind 标签） ──

export const articleFeedItemSchema = z.object({
  kind: z.literal("article"),
  data: postFeedItemSchema,
});

export const momentFeedItemSchema = z.object({
  kind: z.literal("moment"),
  data: postFeedItemSchema,
});

// ── 联合类型 ──

export const homeFeedItemSchema = z.discriminatedUnion("kind", [
  articleFeedItemSchema,
  momentFeedItemSchema,
  circlePostFeedItemSchema,
  modelFeedItemSchema,
  rankingFeedItemSchema,
]);

// ── 聚合 Feed 响应 ──

const feedPaginationSchema = z.object({
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
});

const feedCursorSchema = z.string().min(1).nullable();

export const aggregatedHomeFeedResponseSchema = z.object({
  tab: feedTabSchema,
  activeCategorySlug: z.string().nullable(),
  contentType: homeFeedContentTypeSchema,
  categories: z.array(contentCategorySchema),
  items: z.array(homeFeedItemSchema),
  pagination: feedPaginationSchema,
  nextCursor: feedCursorSchema,
});

export type HomeFeedContentType = z.infer<typeof homeFeedContentTypeSchema>;
export type HomeFeedItem = z.infer<typeof homeFeedItemSchema>;
export type CirclePostFeedItem = z.infer<typeof circlePostFeedItemSchema>;
export type ModelFeedItem = z.infer<typeof modelFeedItemSchema>;
export type RankingFeedItem = z.infer<typeof rankingFeedItemSchema>;
