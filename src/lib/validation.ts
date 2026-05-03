import { z } from "zod";

export const contactRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().email(),
  message: z.string().trim().min(10).max(5000),
  company: z.string().trim().max(200).optional(),
  website: z.string().max(0).optional()
});
