import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const guides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),
    slug: z.string().optional(),
    /** Used instead of `description` while PRICES_VISIBLE is false. */
    descriptionEarlyAccess: z.string().max(170).optional(),
  }),
});

const legal = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),
    /** Used instead of `description` while PRICES_VISIBLE is false. */
    descriptionEarlyAccess: z.string().max(170).optional(),
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
    /** Used instead of `description` and `intro` while PRICES_VISIBLE is false. */
    descriptionEarlyAccess: z.string().max(170).optional(),
    introEarlyAccess: z.string().optional(),
  }),
});

export const collections = { guides, legal, destinations };
