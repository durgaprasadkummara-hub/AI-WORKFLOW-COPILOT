import { addMessage, createConversation, getConversation } from "../repositories/conversationRepository.js";
import { NotFoundError } from "../lib/errors.js";

export async function startConversation(workflowId?: string) {
  return createConversation(workflowId);
}

export async function postMessage(conversationId: string, role: "SYSTEM" | "USER" | "ASSISTANT", content: string) {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    throw new NotFoundError(`Conversation ${conversationId} not found.`);
  }
  return addMessage(conversationId, role, content);
}

export async function getConversationHistory(conversationId: string) {
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    throw new NotFoundError(`Conversation ${conversationId} not found.`);
  }
  return conversation;
}
