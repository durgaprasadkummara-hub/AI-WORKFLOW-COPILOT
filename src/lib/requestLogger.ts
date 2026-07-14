import { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  res.on("finish", () => {
    const elapsed = Date.now() - startTime;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${elapsed}ms`);
  });
  next();
}
