import { z } from "zod";

export const tickerSchema = z
  .string()
  .trim()
  .min(1)
  .max(12)
  .regex(/^[A-Za-z0-9.\-^=]+$/, "Ticker contains invalid characters.");

export const benchmarkSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9.\-^=\s]+$/, "Benchmark contains invalid characters.");

export const portfolioRequestSchema = z.object({
  stock1: tickerSchema,
  stock2: tickerSchema,
  stock3: z.union([tickerSchema, z.literal("")]).optional().default(""),
  covarianceMethod: z.enum(["sample", "constant-correlation", "single-index"]).default("sample"),
  mode: z.enum(["long-only", "allow-short"]).default("long-only")
});

export const contactRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().email(),
  message: z.string().trim().min(10).max(5000),
  company: z.string().trim().max(200).optional(),
  website: z.string().max(0).optional()
});
