import {
  adminSearchQuerySchema,
  adminSearchResponseSchema,
  siteSearchQuerySchema,
  siteSearchResponseSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import {
  attachCurrentUser,
  requireAdmin,
  type AuthVariables
} from "../auth/auth.middleware";
import { searchService } from "./search.service";

export const searchRoute = new Hono<{ Variables: AuthVariables }>();

searchRoute.use("*", attachCurrentUser);

searchRoute.get(API_ROUTES.search.site, async (context) => {
  const query = siteSearchQuerySchema.safeParse({
    q: context.req.query("q") ?? "",
    limit: context.req.query("limit") ?? undefined
  });

  if (!query.success) {
    return context.json({ query: context.req.query("q") ?? "", total: 0, items: [] });
  }

  const payload = await searchService.searchSite({
    query: query.data.q,
    limit: query.data.limit,
    currentUserId: context.var.currentUser?.id ?? null
  });

  return context.json(siteSearchResponseSchema.parse(payload));
});

searchRoute.get(API_ROUTES.search.admin, requireAdmin, async (context) => {
  const query = adminSearchQuerySchema.safeParse({
    q: context.req.query("q") ?? "",
    limit: context.req.query("limit") ?? undefined
  });

  if (!query.success) {
    return context.json({ query: context.req.query("q") ?? "", total: 0, items: [] });
  }

  const payload = await searchService.searchAdmin({
    query: query.data.q,
    limit: query.data.limit
  });

  return context.json(adminSearchResponseSchema.parse(payload));
});
