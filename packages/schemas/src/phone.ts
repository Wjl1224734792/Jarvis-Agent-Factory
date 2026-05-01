import { z } from "zod";

export const chinaMainlandMobilePhoneSchema = z
  .string()
  .regex(/^1[3-9]\d{9}$/, "Invalid China mainland mobile phone number");
