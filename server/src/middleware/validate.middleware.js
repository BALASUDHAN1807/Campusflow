import { ZodError } from "zod";
import { sendError } from "../utils/response.js";

export function validateRequest(schema) {
  return async (req, res, next) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues || error.errors || [];
        const errorMessages = issues.map((err) => err.message).join(", ");
        sendError(res, errorMessages || "Invalid request payload.", 400);
        return;
      }
      sendError(res, "Invalid request payload.", 400);
    }
  };
}
