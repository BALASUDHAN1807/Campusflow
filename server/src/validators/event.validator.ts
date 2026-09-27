import { z } from "zod";
import { QueueEventType } from "@prisma/client";

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid("Invalid event ID format. Must be a valid UUID."),
});

export const eventQuerySchema = z.object({
  queueId: z.string().uuid().optional(),
  eventType: z.nativeEnum(QueueEventType).optional().or(z.literal("ALL")).or(z.literal("HOLD_DECLARED")),
  tokenNumber: z.coerce.number().int().positive().optional(),
  search: z.string().max(100).optional(),
  dateRange: z.enum(["today", "7days", "30days", "all"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
