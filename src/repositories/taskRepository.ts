import prisma from "../lib/prismaClient.js";

export async function getTask(taskId: string) {
  return prisma.task.findUnique({ where: { id: taskId } });
}

export async function listPendingTasks() {
  return prisma.task.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } });
}
