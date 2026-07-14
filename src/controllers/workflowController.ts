import { Request, Response } from "express";
import * as workflowService from "../services/workflowService.js";
import { validateWorkflowPayload } from "../lib/validation.js";

export async function createWorkflow(req: Request, res: Response) {
  const { name, prompt, description, conversationId } = req.body;
  if (!name || !prompt) {
    return res.status(400).json({ error: "Missing required fields 'name' and 'prompt'." });
  }

  const result = await workflowService.createWorkflowFromPrompt(name, prompt, description, conversationId);
  return res.status(201).json(result);
}

export async function createWorkflowAsync(req: Request, res: Response) {
  const { name, prompt, description, conversationId } = req.body;
  if (!name || !prompt) {
    return res.status(400).json({ error: "Missing required fields 'name' and 'prompt'." });
  }

  const task = await workflowService.enqueueWorkflowGeneration(name, prompt, description, conversationId);
  return res.status(202).json({ taskId: task.id, status: task.status });
}

export async function getWorkflow(req: Request, res: Response) {
  const workflow = await workflowService.getWorkflowById(req.params.workflowId);
  return res.json(workflow);
}

export async function listWorkflows(req: Request, res: Response) {
  const workflows = await workflowService.listAllWorkflows();
  return res.json(workflows);
}

export async function patchWorkflow(req: Request, res: Response) {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing required field 'prompt' for workflow modification." });
  }

  const result = await workflowService.modifyWorkflow(req.params.workflowId, prompt);
  return res.json(result);
}

export async function explainWorkflow(req: Request, res: Response) {
  const explanation = await workflowService.explainWorkflow(req.params.workflowId);
  return res.json(explanation);
}

export async function validateWorkflow(req: Request, res: Response) {
  const payload = req.body.payload;
  const validation = await validateWorkflowPayload(payload);
  return res.json(validation);
}
