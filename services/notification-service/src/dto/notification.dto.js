import { z } from "zod";

export const recentNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional().default(50)
});
