import { z } from 'zod';

export const ScrapedEvent = z.object({});

export type ScrapedEvent = z.infer<typeof ScrapedEvent>;
