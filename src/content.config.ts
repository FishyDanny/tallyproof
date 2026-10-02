import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const guides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),
    slug: z.string().optional(),
  }),
});

const legal = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),
  }),
});

const destinations = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/destinations' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),
    slug: z.string().optional(),
    heading: z.string(),
    intro: z.string(),
  }),
});

export const collections = { guides, legal, destinations };
