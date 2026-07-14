import { createAiProvider } from "../lib/providerLoader.js";
import { AiProvider } from "../lib/provider.js";
import { WorkflowPayload } from "../schemas/workflowSchema.js";
import { validateWorkflowPayload } from "../lib/validation.js";
import { logger } from "../lib/logger.js";
import { AiProviderError, ValidationError } from "../lib/errors.js";
import { getConversation } from "../repositories/conversationRepository.js";

export class AiService {
  private provider: AiProvider;

  constructor() {
    this.provider = createAiProvider();
  }

  private async buildConversationHistory(conversationId?: string) {
    if (!conversationId) {
      return undefined;
    }
    const conversation = await getConversation(conversationId);
    return conversation?.messages.map((message) => `${message.role}: ${message.content}`);
  }

  public async generateWorkflow(prompt: string, nodeCatalogTypes: string[], conversationId?: string): Promise<{ payload: WorkflowPayload; summary?: string }> {
    try {
      const conversationHistory = await this.buildConversationHistory(conversationId);
      const result = await this.provider.createWorkflowDraft(prompt, { nodeCatalog: nodeCatalogTypes, conversationHistory });
      const validation = await validateWorkflowPayload(result.payload);
      if (!validation.valid) {
        throw new ValidationError("AI returned an invalid workflow payload.", validation.errors);
      }
      return result;
    } catch (error) {
      logger.error("Failed to generate workflow", error);
      if (error instanceof ValidationError) throw error;
      throw new AiProviderError("Unable to generate workflow from AI provider.");
    }
  }

  public async modifyWorkflow(prompt: string, currentWorkflow: WorkflowPayload, conversationId?: string): Promise<{ payload: WorkflowPayload; summary?: string }> {
    try {
      const conversationHistory = await this.buildConversationHistory(conversationId);
      const result = await this.provider.modifyWorkflowDraft(prompt, currentWorkflow, { conversationHistory });
      const validation = await validateWorkflowPayload(result.payload);
      if (!validation.valid) {
        throw new ValidationError("AI returned an invalid workflow payload.", validation.errors);
      }
      return result;
    } catch (error) {
      logger.error("Failed to modify workflow", error);
      if (error instanceof ValidationError) throw error;
      throw new AiProviderError("Unable to modify workflow from AI provider.");
    }
  }

  public async explainWorkflow(currentWorkflow: WorkflowPayload) {
    try {
      return this.provider.explainWorkflow(currentWorkflow);
    } catch (error) {
      logger.error("Failed to explain workflow", error);
      throw new AiProviderError("Unable to explain workflow.");
    }
  }
}
