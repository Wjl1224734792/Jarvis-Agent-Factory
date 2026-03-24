import { rankingsResponseSchema } from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import { attachCurrentUser, type AuthVariables } from "../auth/auth.middleware";
import { rankingsService } from "./rankings.service";

export const rankingsRoute = new Hono<{ Variables: AuthVariables }>();

rankingsRoute.use("*", attachCurrentUser);

rankingsRoute.get(API_ROUTES.rankings.overview, async (context) => {
  const currentUser = context.get("currentUser");
  const payload = await rankingsService.listRankings(currentUser?.id);

  return context.json(rankingsResponseSchema.parse(payload));
});
