import prisma from "../lib/prismaClient.js";

export async function createConversation(workflowId?: string) {
  return prisma.conversation.create({ data: { workflowId } });
}

export async function addMessage(conversationId: string, role: "SYSTEM" | "USER" | "ASSISTANT", content: string) {
  return prisma.message.create({ data: { conversationId, role, content } });
}

export async function getConversation(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}
