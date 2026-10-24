import { z } from "zod";

export const queueIdParamSchema = z.object({
  queueId: z.string().uuid("Invalid queue ID format. Must be a valid UUID."),
});

export const tokenIdParamSchema = z.object({
  tokenId: z.string().uuid("Invalid token ID format. Must be a valid UUID."),
});

export const declareHoldSchema = z.object({
  startTime: z.string().datetime({ message: "Start time must be a valid ISO-8601 datetime string." }),
  endTime: z.string().datetime({ message: "End time must be a valid ISO-8601 datetime string." }),
  reason: z
    .string()
    .min(2, "Reason must be at least 2 characters long.")
    .max(255, "Reason cannot exceed 255 characters."),
});

export const updateQueueConfigSchema = z
  .object({
    maxSkips: z.number().int().min(1, "maxSkips must be at least 1").max(20, "maxSkips cannot exceed 20"),
    minLeadTime: z
      .number()
      .int()
      .min(0, "minLeadTime must be at least 0 minutes")
      .max(120, "minLeadTime cannot exceed 120 minutes"),
    maxHoldDuration: z
      .number()
      .int()
      .min(1, "maxHoldDuration must be at least 1 minute")
      .max(480, "maxHoldDuration cannot exceed 480 minutes"),
  })
  .refine((data) => data.maxHoldDuration >= data.minLeadTime, {
    message: "maxHoldDuration must be greater than or equal to minLeadTime",
    path: ["maxHoldDuration"],
  });
