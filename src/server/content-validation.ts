import { z } from "zod";

export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens");

export const membershipSchema = z.enum(["free", "start", "pro", "ultra"]);

export const courseInputSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  status: z.enum(["active", "draft", "archived"]).default("draft"),
  level: z.string().max(80).nullable().optional(),
  requiredTier: membershipSchema.default("free"),
  sortOrder: z.number().int().min(0).default(0),
});

export const sectionInputSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const lessonInputSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1).max(160),
  videoUrl: z.string().url().nullable().optional(),
  durationSeconds: z.number().int().min(0).default(0),
  content: z.string().max(100_000).nullable().optional(),
  summary: z.string().max(5000).nullable().optional(),
  exerciseData: z.string().max(100_000).nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
});
