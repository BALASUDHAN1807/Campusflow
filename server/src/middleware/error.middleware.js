import { sendError } from "../utils/response.js";

export class AppError extends Error {
  statusCode;
  isOperational;

  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, _req, res, _next) {
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

export function notFoundHandler(req, res) {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}
