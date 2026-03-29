import { z } from "zod";

export const fileBizTypeSchema = z.enum([
  "avatar-image",
  "post-image",
  "post-video",
  "aircraft-cover-image",
  "aircraft-video",
  "ranking-cover-image",
  "ranking-item-image"
]);

export const fileMediaKindSchema = z.enum(["image", "video"]);
export const fileStatusSchema = z.enum(["pending", "uploaded", "failed", "deleted"]);
export const fileVisibilitySchema = z.enum(["public", "private"]);

export const uploadDescriptorSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("presigned-put"),
    url: z.string().url(),
    headers: z.record(z.string(), z.string()).default({}),
    expiresIn: z.number().int().positive()
  })
]);

export const fileItemSchema = z.object({
  id: z.string().min(1),
  bizType: fileBizTypeSchema,
  mediaKind: fileMediaKindSchema,
  status: fileStatusSchema,
  visibility: fileVisibilitySchema,
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  byteSize: z.number().int().nonnegative(),
  url: z.string().min(1),
  uploadedAt: z.string().datetime().nullable()
});

export const imageFileSchema = fileItemSchema.extend({
  mediaKind: z.literal("image")
});

export const videoFileSchema = fileItemSchema.extend({
  mediaKind: z.literal("video")
});

export const initUploadInputSchema = z.object({
  bizType: fileBizTypeSchema,
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(120),
  size: z.number().int().positive()
});

export const initUploadResponseSchema = z.object({
  fileId: z.string().min(1),
  objectKey: z.string().min(1),
  upload: uploadDescriptorSchema
});

export const completeUploadInputSchema = z.object({
  fileId: z.string().min(1)
});

export const completeUploadResponseSchema = z.object({
  item: fileItemSchema
});

export const fileUrlResponseSchema = z.object({
  url: z.string().min(1)
});

export type FileBizType = z.infer<typeof fileBizTypeSchema>;
export type FileMediaKind = z.infer<typeof fileMediaKindSchema>;
export type FileStatus = z.infer<typeof fileStatusSchema>;
export type FileVisibility = z.infer<typeof fileVisibilitySchema>;
export type FileItem = z.infer<typeof fileItemSchema>;
