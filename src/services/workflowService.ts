import { validateWorkflowPayload, WorkflowValidationResult } from "../lib/validation.js";
import { createWorkflow, loadWorkflow, updateWorkflow, listWorkflows } from "../repositories/workflowRepository.js";
import { AiService } from "./aiService.js";
import { listNodeDefinitions } from "../repositories/nodeCatalogRepository.js";
import { createAuditLog } from "../repositories/auditRepository.js";
import { TaskPayload, taskQueue } from "../lib/taskQueue.js";
import { WorkflowPayload } from "../schemas/workflowSchema.js";
import { NotFoundError } from "../lib/errors.js";

const aiService = new AiService();

export async function getWorkflowById(workflowId: string) {
  const workflow = await loadWorkflow(workflowId);
  if (!workflow) {
    throw new NotFoundError(`Workflow ${workflowId} not found.`);
  }
  return workflow;
}

export async function createWorkflowFromPrompt(name: string, prompt: string, description?: string, conversationId?: string) {
  const nodeDefinitions = await listNodeDefinitions();
  const nodeCatalog = nodeDefinitions.map((node) => node.key);
  const aiResult = await aiService.generateWorkflow(prompt, nodeCatalog, conversationId);
  const workflow = await createWorkflow(name, description, aiResult.payload);

  await createAuditLog({
    entityId: workflow.id,
    entityType: "WORKFLOW",
    action: "CREATE",
    metadata: {
      name,
      prompt,
      description,
      version: aiResult.payload.metadata.version,
    },
  });

  return { workflow, summary: aiResult.summary };
}

export async function validateWorkflow(payload: unknown): Promise<WorkflowValidationResult> {
  return validateWorkflowPayload(payload);
}

export async function modifyWorkflow(workflowId: string, prompt: string) {
  const workflow = await getWorkflowById(workflowId);
  const existingPayload = workflow.latestVersion?.payload;
  if (!existingPayload) {
    throw new NotFoundError("Current workflow payload is unavailable.");
  }
  const aiResult = await aiService.modifyWorkflow(prompt, existingPayload);
  const updated = await updateWorkflow(workflowId, workflow.name, workflow.description ?? undefined, aiResult.payload, false);

  await createAuditLog({
    entityId: workflowId,
    entityType: "WORKFLOW",
    action: "MODIFY",
    metadata: {
      prompt,
      version: aiResult.payload.metadata.version,
    },
  });

  return { workflow: updated, summary: aiResult.summary };
}

export async function explainWorkflow(workflowId: string) {
  const workflow = await getWorkflowById(workflowId);
  const payload = workflow.latestVersion?.payload;
  if (!payload) {
    throw new NotFoundError("Workflow payload not found.");
  }
  return aiService.explainWorkflow(payload);
}

export async function enqueueWorkflowGeneration(name: string, prompt: string, description?: string, conversationId?: string) {
  const payload: TaskPayload = { name, prompt, description, conversationId };
  return taskQueue.enqueue("WORKFLOW_GENERATION", payload);
}

export async function listAllWorkflows() {
  return listWorkflows();
}
