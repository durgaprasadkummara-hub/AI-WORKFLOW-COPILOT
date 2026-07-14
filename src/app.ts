import express from "express";
import cors from "cors";
import "express-async-errors";
import apiRouter from "./api/index.js";
import { logger } from "./lib/logger.js";
import { requestLogger } from "./lib/requestLogger.js";
import { metricsMiddleware } from "./lib/metrics.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(metricsMiddleware);

// Root health check — must be before the API router and error handler
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "AI Workflow Copilot Backend" });
});

app.use("/api", apiRouter);

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error("Unhandled error", err);
  if (err instanceof Error) {
    return res.status(500).json({ error: err.message });
  }
  return res.status(500).json({ error: "Internal server error." });
});

export default app;
