import { z } from 'zod';

export const ScrapedEventSchema = z.object({});

export type ScrapedEvent = z.infer<typeof ScrapedEventSchema>;
