import { Request, Response, NextFunction } from "express";
import { ZodTypeAny, ZodError } from "zod";
import { sendError } from "../utils/response.js";

export function validateParams(schema: ZodTypeAny) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req.params);
      req.params = parsed as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = (error as any).issues || (error as any).errors || [];
        const errorMessages = issues.map((err: { message: string }) => err.message).join(", ");
        sendError(res, errorMessages || "Invalid URL parameters.", 400);
        return;
      }
      sendError(res, "Invalid URL parameters.", 400);
    }
  };
}
