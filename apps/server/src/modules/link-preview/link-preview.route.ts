import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import { linkPreviewRepo } from "./link-preview.repo";

export const linkPreviewRoute = new Hono();

linkPreviewRoute.get(API_ROUTES.linkPreview, async (context) => {
  const url = context.req.query("url");
  if (!url) {
    return context.json(
      { code: "BAD_REQUEST", message: "Missing url parameter." },
      400,
    );
  }
  const item = await linkPreviewRepo.resolve(url);
  return context.json({ item });
});
