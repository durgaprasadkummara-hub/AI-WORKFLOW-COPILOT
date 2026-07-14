import prisma from "../lib/prismaClient.js";

export async function createAuditLog(data: {
  entityId: string;
  entityType: string;
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      entityId: data.entityId,
      entityType: data.entityType,
      action: data.action,
      userId: data.userId,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    },
  });
}

export async function listAuditLogs(entityId: string) {
  return prisma.auditLog.findMany({
    where: { entityId },
    orderBy: { createdAt: "desc" },
  });
}
