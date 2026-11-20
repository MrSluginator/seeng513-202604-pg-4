import { z } from 'zod';

export const TagSchema = z.object({

});

export type Tag = z.infer<typeof TagSchema>;
