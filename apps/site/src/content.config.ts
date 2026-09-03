import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['software', 'gamedev', 'ai', 'web', 'design']),
    status: z.enum(['active', 'paused', 'completed']),
    bounty: z.string().optional(),
    stack: z.array(z.string()),
    year: z.coerce.date(),
    github: z.string().url().optional(),
    demo: z.string().url().optional(),
    order: z.number().default(0),
  }),
});

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, posts };