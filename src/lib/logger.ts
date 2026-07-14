type LogArgs = Array<unknown>;

export const logger = {
  info: (...args: LogArgs): void => console.info("[INFO]", ...args),
  warn: (...args: LogArgs): void => console.warn("[WARN]", ...args),
  error: (...args: LogArgs): void => console.error("[ERROR]", ...args),
  debug: (...args: LogArgs): void => {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv !== "production" && nodeEnv !== "prod") {
      console.debug("[DEBUG]", ...args);
    }
  },
} as const;
