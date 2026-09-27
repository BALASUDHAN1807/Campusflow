import { z } from "zod";

export const notificationIdParamSchema = z.object({
  notificationId: z.string().uuid("Invalid notification ID format. Must be a valid UUID."),
});

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === "1"),
});
