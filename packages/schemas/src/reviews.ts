import { z } from "zod";

export const reviewRatingSchema = z.number().int().min(1).max(5).nullable();
