import { z } from "zod";

export const httpApiOgEntryReturnValidator = z.object({
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().nullable(),
});
