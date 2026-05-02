import { z } from "zod";

export const initUploadInputSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  byteSize: z.number().int().nonnegative(),
});

export const initUploadResponseSchema = z.object({
  uploadId: z.string().min(1),
  uploadUrl: z.string().min(1),
  fields: z.record(z.string()).optional(),
});

export const completeUploadInputSchema = z.object({
  uploadId: z.string().min(1),
});

export const completeUploadResponseSchema = z.object({
  fileId: z.string().min(1),
  url: z.string().min(1),
});

export const fileUrlResponseSchema = z.object({
  url: z.string().min(1),
});
