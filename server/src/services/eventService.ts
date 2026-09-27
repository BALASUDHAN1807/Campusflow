import { PrismaClient, QueueEventType, QueueEvent, UserRole, Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error.middleware.js";

type PrismaTx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export interface GetEventsOptions {
  queueId?: string;
  eventType?: string;
  tokenNumber?: number;
  search?: string;
  dateRange?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  userId?: string;
  userRole?: UserRole;
}

export class EventService {
  /**
   * Append-only transactional QueueEvent audit record creation.
   */
  public static async createQueueEvent(
    queueId: string,
    tokenId: string | null,
    eventType: QueueEventType,
    metadata?: Record<string, any>,
    tx?: PrismaTx
  ): Promise<QueueEvent> {
    if (!queueId) {
      throw new AppError("queueId is required to create a QueueEvent.", 400);
    }

    const client = tx || defaultPrisma;

    // Sanitize metadata to guarantee no passwords, hashes, or secrets are stored
    let cleanMetadata = undefined;
    if (metadata) {
      const copy = { ...metadata };
      delete copy.password;
      delete copy.passwordHash;
      delete copy.token;
      delete copy.jwt;
      cleanMetadata = JSON.parse(JSON.stringify(copy));
    }

    return client.queueEvent.create({
      data: {
        queueId,
        tokenId: tokenId || undefined,
        eventType,
        metadata: cleanMetadata,
      },
    });
  }

  /**
   * Query events with role-based scoping, server-side filtering, debounced search, date range, and pagination.
   */
  public static async getEvents(options: GetEventsOptions) {
    const {
      queueId,
      eventType,
      tokenNumber,
      search,
      dateRange,
      sortOrder = "desc",
      page = 1,
      pageSize = 20,
      userId,
      userRole,
    } = options;

    const where: Prisma.QueueEventWhereInput = {};

    // Queue filter
    if (queueId) {
      where.queueId = queueId;
    }

    // Role-based security: Students can only view events belonging to their own tokens
    if (userRole === UserRole.STUDENT && userId) {
      where.token = {
        userId,
      };
    }

    // Event Type filter
    if (eventType && eventType !== "ALL") {
      if (eventType === "HOLD_DECLARED") {
        where.eventType = {
          in: [QueueEventType.HOLD_DECLARED, QueueEventType.HOLD_EXPIRED, QueueEventType.HOLD_CANCELLED],
        };
      } else if (Object.values(QueueEventType).includes(eventType as QueueEventType)) {
        where.eventType = eventType as QueueEventType;
      }
    }

    // Token Number filter
    if (tokenNumber) {
      where.token = {
        ...((where.token as Prisma.QueueTokenWhereInput) || {}),
        tokenNumber,
      };
    }

    // Search query: substring match on token number or student name (for staff)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase().replace("cf-", "").replace("#", "");
      const numVal = parseInt(q, 10);

      const orConditions: Prisma.QueueEventWhereInput[] = [];

      if (!isNaN(numVal)) {
        orConditions.push({
          token: { tokenNumber: numVal },
        });
      }

      if (userRole === UserRole.STAFF) {
        orConditions.push({
          token: {
            user: {
              name: { contains: search.trim(), mode: "insensitive" },
            },
          },
        });
      }

      if (orConditions.length > 0) {
        where.OR = orConditions;
      }
    }

    // Date range filter
    if (dateRange && dateRange !== "all") {
      const now = new Date();
      let startDate: Date | null = null;

      if (dateRange === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      } else if (dateRange === "7days") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === "30days") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      if (startDate) {
        where.createdAt = { gte: startDate };
      }
    }

    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const [events, total] = await Promise.all([
      defaultPrisma.queueEvent.findMany({
        where,
        include: {
          queue: {
            include: {
              service: {
                select: { name: true, description: true },
              },
            },
          },
          token: {
            select: {
              id: true,
              tokenNumber: true,
              status: true,
              skipCount: true,
              joinedAt: true,
              servingAt: true,
              completedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
              smartHolds: {
                where: { status: "ACTIVE" },
                select: {
                  id: true,
                  startTime: true,
                  endTime: true,
                  reason: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: sortOrder },
        skip,
        take,
      }),
      defaultPrisma.queueEvent.count({ where }),
    ]);

    // Format events safely (scrubbing user names if student viewing)
    const formattedEvents = events.map((e) => {
      const studentName =
        userRole === UserRole.STAFF || (userId && e.token?.user?.id === userId)
          ? e.token?.user?.name
          : undefined;

      return {
        id: e.id,
        queueId: e.queueId,
        serviceName: e.queue.service.name,
        tokenId: e.tokenId,
        eventType: e.eventType,
        metadata: e.metadata,
        createdAt: e.createdAt,
        token: e.token
          ? {
              tokenId: e.token.id,
              tokenNumber: e.token.tokenNumber,
              status: e.token.status,
              skipCount: e.token.skipCount,
              studentName,
              joinedAt: e.token.joinedAt,
              servingAt: e.token.servingAt,
              completedAt: e.token.completedAt,
              activeHold: e.token.smartHolds[0] || null,
            }
          : null,
      };
    });

    return {
      events: formattedEvents,
      pagination: {
        page,
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  }

  /**
   * Get rich details for a single event to populate the Event Details Drawer.
   */
  public static async getEventDetails(eventId: string, userId: string, userRole: UserRole) {
    const event = await defaultPrisma.queueEvent.findUnique({
      where: { id: eventId },
      include: {
        queue: {
          include: {
            service: true,
          },
        },
        token: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            smartHolds: { orderBy: { createdAt: "desc" } },
          },
        },
      },
    });

    if (!event) {
      throw new AppError("Queue event not found.", 404);
    }

    // Authorization check: Student can only view their own token's event
    if (userRole === UserRole.STUDENT && event.token?.userId !== userId) {
      throw new AppError("You do not have permission to view details of this event.", 403);
    }

    const studentName =
      userRole === UserRole.STAFF || event.token?.userId === userId
        ? event.token?.user.name
        : undefined;

    return {
      id: event.id,
      queueId: event.queueId,
      serviceName: event.queue.service.name,
      queueStatus: event.queue.status,
      maxSkips: event.queue.maxSkips,
      eventType: event.eventType,
      metadata: event.metadata,
      createdAt: event.createdAt,
      token: event.token
        ? {
            tokenId: event.token.id,
            tokenNumber: event.token.tokenNumber,
            status: event.token.status,
            skipCount: event.token.skipCount,
            joinedAt: event.token.joinedAt,
            servingAt: event.token.servingAt,
            completedAt: event.token.completedAt,
            studentName,
            smartHolds: event.token.smartHolds,
          }
        : null,
    };
  }

  /**
   * Helper method preserved for backwards compatibility with staff dashboard polling.
   */
  public static async getEventsByQueueId(queueId: string, limit: number = 30) {
    return defaultPrisma.queueEvent.findMany({
      where: { queueId },
      include: {
        token: {
          select: {
            tokenNumber: true,
            status: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
