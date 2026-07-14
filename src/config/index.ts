import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Application configuration with validation
 * All values are validated at runtime to catch configuration errors early
 */
export const config = {
  port: validatePort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  aiProvider: validateProvider(process.env.AI_PROVIDER),
  openAiKey: process.env.OPENAI_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  taskPollIntervalMs: 500,
  nodeEnv: getNodeEnv(),
  logLevel: process.env.LOG_LEVEL ?? "info",
};

/**
 * Validate and parse port number
 */
function validatePort(portStr?: string): number {
  if (!portStr) return 4000;
  const port = Number(portStr);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${portStr}. Must be a number between 1 and 65535.`);
  }
  return port;
}

/**
 * Validate AI provider
 */
function validateProvider(provider?: string): string {
  const validProviders = ["openai", "claude", "mock"];
  const normalized = (provider ?? "openai").toLowerCase();
  if (!validProviders.includes(normalized)) {
    throw new Error(`Invalid AI_PROVIDER: ${provider}. Must be one of: ${validProviders.join(", ")}`);
  }
  return normalized;
}

/**
 * Get and validate NODE_ENV
 */
function getNodeEnv(): "development" | "production" | "test" {
  const env = (process.env.NODE_ENV ?? "development").toLowerCase();
  if (!["development", "production", "test"].includes(env)) {
    return "development";
  }
  return env as "development" | "production" | "test";
}
