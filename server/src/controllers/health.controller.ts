import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function getHealthCheck(_req: Request, res: Response): Promise<void> {
  try {
    // Quick, non-blocking database ping
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      message: "CampusFlow API is running",
      database: "connected",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      message: "CampusFlow API is experiencing issues",
      database: "disconnected",
      error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
}
