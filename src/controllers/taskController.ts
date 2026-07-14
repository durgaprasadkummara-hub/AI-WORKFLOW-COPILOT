import { Request, Response } from "express";
import { getTask } from "../repositories/taskRepository.js";
import { taskQueue } from "../lib/taskQueue.js";

export async function getTaskStatus(req: Request, res: Response) {
  const task = await getTask(req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found." });
  }
  return res.json(task);
}

export async function subscribeTask(req: Request, res: Response) {
  const taskId = req.params.taskId;
  res.writeHead(200, {
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream",
    "Access-Control-Allow-Origin": "*",
  });

  const sendEvent = (event: unknown) => {
    const payload = JSON.stringify(event);
    res.write(`data: ${payload}\n\n`);
  };

  const listener = (update: { taskId: string; status: string; result?: unknown; error?: string }) => {
    if (update.taskId === taskId) {
      sendEvent(update);
    }
  };

  taskQueue.on("task:update", listener);
  req.on("close", () => {
    taskQueue.off("task:update", listener);
  });

  sendEvent({ taskId, status: "SUBSCRIBED" });
}
