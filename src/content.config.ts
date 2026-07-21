import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const sourceSchema = z.object({
  title: z.string(),
  url: z.url(),
});

const commonSchema = z.object({
  title: z.string(),
  description: z.string().min(50).max(180),
  published: z.coerce.date(),
  updated: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  readingMinutes: z.number().int().positive().optional(),
  sources: z.array(sourceSchema).default([]),
  affiliate: z.boolean().default(false),
});

const guides = defineCollection({
  loader: glob({ base: './src/content/guides', pattern: '**/*.{md,mdx}' }),
  schema: commonSchema,
});

const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '**/*.{md,mdx}' }),
  schema: commonSchema,
});

const news = defineCollection({
  loader: glob({ base: './src/content/news', pattern: '**/*.{md,mdx}' }),
  schema: commonSchema,
});

export const collections = { guides, articles, news };
