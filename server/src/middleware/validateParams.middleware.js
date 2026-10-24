import { ZodError } from "zod";
import { sendError } from "../utils/response.js";

export function validateParams(schema) {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req.params);
      req.params = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues || error.errors || [];
        const errorMessages = issues.map((err) => err.message).join(", ");
        sendError(res, errorMessages || "Invalid URL parameters.", 400);
        return;
      }
      sendError(res, "Invalid URL parameters.", 400);
    }
  };
}
