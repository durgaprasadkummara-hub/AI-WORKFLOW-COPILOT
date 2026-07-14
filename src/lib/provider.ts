import { WorkflowPayload } from "../schemas/workflowSchema.js";

export type AiCompletionSettings = {
  maxTokens?: number;
  temperature?: number;
};

export type AiWorkflowResult = {
  payload: WorkflowPayload;
  summary?: string;
};

export type AiExplanationResult = {
  explanation: string;
};

export interface AiProvider {
  createWorkflowDraft(prompt: string, context?: { existingWorkflow?: WorkflowPayload; nodeCatalog?: string[]; conversationHistory?: string[] }): Promise<AiWorkflowResult>;
  modifyWorkflowDraft(prompt: string, currentWorkflow: WorkflowPayload, context?: { conversationHistory?: string[] }): Promise<AiWorkflowResult>;
  explainWorkflow(currentWorkflow: WorkflowPayload): Promise<AiExplanationResult>;
}
