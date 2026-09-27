import { Response } from "express";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200
): Response {
  const payload: ApiResponse<T> = {
    success: true,
  };

  if (message) {
    payload.message = message;
  }

  if (data !== undefined) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string = "Something went wrong",
  statusCode: number = 500,
  errorDetails?: string
): Response {
  const payload: ApiResponse = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV !== "production" && errorDetails) {
    payload.error = errorDetails;
  }

  return res.status(statusCode).json(payload);
}
