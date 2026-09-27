import { Request, Response, NextFunction } from "express";
import { ZodTypeAny, ZodError } from "zod";
import { sendError } from "../utils/response.js";

export function validateRequest(schema: ZodTypeAny) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = (error as any).issues || (error as any).errors || [];
        const errorMessages = issues.map((err: { message: string }) => err.message).join(", ");
        sendError(res, errorMessages || "Invalid request payload.", 400);
        return;
      }
      sendError(res, "Invalid request payload.", 400);
    }
  };
}
