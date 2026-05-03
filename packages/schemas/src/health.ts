import { z } from "zod";

export const healthRoute = {
  method: "GET",
  path: "/health"
} as const;

export const healthStatusSchema = z.literal("ok");

export const healthResponseSchema = z.object({
  status: healthStatusSchema,
  service: z.string().min(1),
  timestamp: z.string().datetime(),
  version: z.string().min(1)
});

export const errorResponseSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1)
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
