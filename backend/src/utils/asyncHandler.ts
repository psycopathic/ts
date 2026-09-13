// Forwards synchronous throws and rejected async route handlers to Express error handling.
import type { NextFunction, Request, RequestHandler, Response } from "express";

export const asyncHandler = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => (req, res, next) => {
  Promise.resolve().then(() => handler(req, res, next)).catch(next);
};
