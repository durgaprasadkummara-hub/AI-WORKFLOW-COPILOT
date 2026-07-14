import "./config/index.js";
import app from "./app.js";
import { config } from "./config/index.js";
import prisma from "./lib/prismaClient.js";
import { logger } from "./lib/logger.js";
import { taskQueue } from "./lib/taskQueue.js";
import { AiService } from "./services/aiService.js";
import * as workflowService from "./services/workflowService.js";
import { initializeDLQ } from "./lib/deadLetterQueue.js";
import { initializeCostTracker, costTracker } from "./lib/costTracker.js";
import { circuitBreakerRegistry } from "./lib/circuitBreaker.js";

const aiService = new AiService();

async function startup() {
  await prisma.$connect();
  logger.info("Connected to the database.");

  // Initialize Dead-Letter Queue
  initializeDLQ(prisma);
  logger.info("Dead-Letter Queue initialized");

  // Initialize Cost Tracker
  initializeCostTracker(prisma);
  logger.info("Cost Tracker initialized");

  // Initialize Circuit Breakers for providers
  const openaiBreaker = circuitBreakerRegistry.getOrCreate("openai", {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
  });

  const claudeBreaker = circuitBreakerRegistry.getOrCreate("claude", {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
  });

  logger.info("Circuit Breakers initialized", {
    breakers: ["openai", "claude"],
  });

  taskQueue.on("task:process", async (task) => {
    try {
      logger.info("Processing task", task.id, task.type);
      switch (task.type) {
        case "WORKFLOW_GENERATION": {
          const payload = JSON.parse(task.payload as string) as { name: string; prompt: string; description?: string; conversationId?: string };
          const result = await workflowService.createWorkflowFromPrompt(payload.name, payload.prompt, payload.description, payload.conversationId);
          await taskQueue.completeTask(task.id, result);
          break;
        }
        case "EXPLANATION": {
          const payload = JSON.parse(task.payload as string) as { workflow: unknown };
          const explanation = await aiService.explainWorkflow(payload as any);
          await taskQueue.completeTask(task.id, explanation);
          break;
        }
        default:
          await taskQueue.failTask(task.id, `No processor enabled for type ${task.type}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown task failure.";
      await taskQueue.failTask(task.id, message);
    }
  });

  const server = app.listen(config.port, () => {
    logger.info(`AI Workflow Copilot backend running on http://localhost:${config.port}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.error(`Port ${config.port} is already in use. Please set a different PORT or stop the process using it.`);
    } else {
      logger.error("Server listen error", error);
    }
    process.exit(1);
  });
}

startup().catch((error) => {
  logger.error("Startup failed", error);
  process.exit(1);
});

