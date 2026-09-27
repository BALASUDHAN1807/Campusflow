import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.js";

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Something went wrong";
  const errorDetails = err.stack;

  // Centralized logging
  console.error(`[Error] ${statusCode} - ${message}`);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  sendError(res, message, statusCode, errorDetails);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}
