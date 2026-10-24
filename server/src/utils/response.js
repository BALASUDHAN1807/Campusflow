export function sendSuccess(res, data, message, statusCode = 200) {
  const payload = {
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

export function sendError(res, message = "Something went wrong", statusCode = 500, errorDetails) {
  const payload = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV !== "production" && errorDetails) {
    payload.error = errorDetails;
  }

  return res.status(statusCode).json(payload);
}
