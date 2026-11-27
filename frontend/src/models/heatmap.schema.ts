import { z } from 'zod';

export const HeatPointSchema = z.object({
  event_id: z.string(),
  title: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  intensity: z.number().min(0).max(1),
  source: z.enum(['crowd', 'visits']),
  venue: z.string().nullable(),
});

export const HeatmapResponseSchema = z.object({
  hour: z.number().int().min(0).max(23),
  day: z.number().int().min(0).max(6),
  generated_at: z.iso.datetime({ offset: true }).transform((s) => new Date(s)),
  points: z.array(HeatPointSchema),
});

export type HeatPoint = z.infer<typeof HeatPointSchema>;
export type HeatmapResponse = z.infer<typeof HeatmapResponseSchema>;

export interface HeatmapQuery {
  hour: number;
  day?: number;
  min_lat?: number;
  max_lat?: number;
  min_lng?: number;
  max_lng?: number;
  limit?: number;
}
