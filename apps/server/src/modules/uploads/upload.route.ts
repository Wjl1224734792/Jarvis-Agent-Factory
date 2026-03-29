import {
  completeUploadInputSchema,
  completeUploadResponseSchema,
  fileUrlResponseSchema,
  initUploadInputSchema,
  initUploadResponseSchema
} from "@feijia/schemas";
import { API_ROUTES } from "@feijia/shared";
import { Hono } from "hono";
import { attachCurrentUser, requireAuth, type AuthVariables } from "../auth/auth.middleware";
import { uploadsService } from "./upload.service";

export const uploadsRoute = new Hono<{ Variables: AuthVariables }>();

uploadsRoute.use("*", attachCurrentUser);

uploadsRoute.post(API_ROUTES.uploads.init, requireAuth, async context => {
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = initUploadInputSchema.parse(await context.req.json());
  const result = await uploadsService.initUpload({
    ownerId: currentUser.id,
    bizType: input.bizType,
    fileName: input.filename,
    contentType: input.contentType,
    byteSize: input.size
  });

  if (result.kind === "invalid_mime") {
    return context.json({ code: "BAD_REQUEST", message: "Unsupported file type." }, 400);
  }
  if (result.kind === "file_too_large") {
    return context.json({ code: "BAD_REQUEST", message: "File size exceeds limit." }, 400);
  }
  if (result.kind !== "ok") {
    return context.json({ code: "INTERNAL_ERROR", message: "Failed to initialize upload." }, 500);
  }

  return context.json(initUploadResponseSchema.parse(result.payload));
});

uploadsRoute.post(API_ROUTES.uploads.complete, requireAuth, async context => {
  const currentUser = context.get("currentUser");
  if (!currentUser) {
    return context.json({ code: "UNAUTHORIZED", message: "Login required." }, 401);
  }

  const input = completeUploadInputSchema.parse(await context.req.json());
  const result = await uploadsService.completeUpload({
    ownerId: currentUser.id,
    fileId: input.fileId
  });

  if (result.kind === "not_found") {
    return context.json({ code: "NOT_FOUND", message: "Upload not found." }, 404);
  }
  if (result.kind === "missing_object") {
    return context.json({ code: "BAD_REQUEST", message: "Uploaded object is missing." }, 400);
  }
  if (result.kind === "size_mismatch" || result.kind === "content_type_mismatch") {
    return context.json({ code: "BAD_REQUEST", message: "Uploaded object validation failed." }, 400);
  }

  return context.json(completeUploadResponseSchema.parse(result.payload));
});

uploadsRoute.get(API_ROUTES.files.url(":id"), async context => {
  const fileId = context.req.param("id");
  if (!fileId) {
    return context.json({ code: "BAD_REQUEST", message: "Missing file id." }, 400);
  }

  const payload = await uploadsService.getFileUrl(fileId);
  if (!payload) {
    return context.json({ code: "NOT_FOUND", message: "File not found." }, 404);
  }

  return context.json(fileUrlResponseSchema.parse(payload));
});
