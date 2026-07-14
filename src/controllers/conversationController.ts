import { Request, Response } from "express";
import * as conversationService from "../services/conversationService.js";

export async function startConversation(req: Request, res: Response) {
  const { workflowId } = req.body;
  const conversation = await conversationService.startConversation(workflowId);
  return res.status(201).json(conversation);
}

export async function postMessage(req: Request, res: Response) {
  const { role, content } = req.body;
  const conversationId = req.params.conversationId;
  if (!role || !content) {
    return res.status(400).json({ error: "Missing required fields 'role' and 'content'." });
  }
  const message = await conversationService.postMessage(conversationId, role, content);
  return res.status(201).json(message);
}

export async function getConversation(req: Request, res: Response) {
  const conversation = await conversationService.getConversationHistory(req.params.conversationId);
  return res.json(conversation);
}
