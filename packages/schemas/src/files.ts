import { z } from "zod";

export const fileBizTypeSchema = z.enum(["post_image", "post_video", "avatar", "report_evidence"]);
export type FileBizType = z.infer<typeof fileBizTypeSchema>;

export const imageFileSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  byteSize: z.number().int().nonnegative()
});

export const videoFileSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  byteSize: z.number().int().nonnegative()
});
