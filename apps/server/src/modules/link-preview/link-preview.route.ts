import { API_ROUTES, API_V1_PREFIX } from "@feijia/shared";
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
  // 仅允许相对路径或本站完整 URL，防止 SSRF
  if (!url.startsWith("/") && !url.startsWith(API_V1_PREFIX)) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return context.json(
          { code: "BAD_REQUEST", message: "Invalid url protocol." },
          400,
        );
      }
      if (parsed.hostname !== "localhost" && !parsed.hostname.includes("feijia")) {
        return context.json(
          { code: "BAD_REQUEST", message: "Only internal links are supported." },
          400,
        );
      }
    } catch {
      return context.json(
        { code: "BAD_REQUEST", message: "Invalid url format." },
        400,
      );
    }
  }
  const item = await linkPreviewRepo.resolve(url);
  return context.json({ item });
});
