import EventEmitter from "events";
import prisma from "./prismaClient.js";
import { logger } from "./logger.js";

export type TaskPayload = Record<string, unknown>;

type TaskEvent = {
  taskId: string;
  status: string;
  result?: unknown;
  error?: string;
};

export class TaskQueue extends EventEmitter {
  private isRunning = false;

  constructor() {
    super();
  }

  public async enqueue(type: string, payload: TaskPayload) {
    const task = await prisma.task.create({
      data: { type, status: "PENDING", payload: JSON.stringify(payload) },
    });
    this.emit("task:update", { taskId: task.id, status: task.status });
    this.processNext().catch((error) => logger.error("Task queue failed", error));
    return task;
  }

  private async processNext() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const task = await prisma.task.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
      });
      if (!task) {
        return;
      }

      await prisma.task.update({ where: { id: task.id }, data: { status: "IN_PROGRESS" } });
      this.emit("task:update", { taskId: task.id, status: "IN_PROGRESS" });

      // The actual processor is wired by user code through onProcessTask.
      this.emit("task:process", task);
    } finally {
      this.isRunning = false;
    }
  }

  public async completeTask(taskId: string, result: unknown) {
    await prisma.task.update({ where: { id: taskId }, data: { status: "COMPLETED", result: JSON.stringify(result) } });
    this.emit("task:update", { taskId, status: "COMPLETED", result });
    this.processNext().catch((error) => logger.error("Task queue failed", error));
  }

  public async failTask(taskId: string, error: string) {
    await prisma.task.update({ where: { id: taskId }, data: { status: "FAILED", lastError: error } });
    this.emit("task:update", { taskId, status: "FAILED", error });
    this.processNext().catch((error) => logger.error("Task queue failed", error));
  }
}

export const taskQueue = new TaskQueue();
