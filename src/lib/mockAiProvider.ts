import { AiExplanationResult, AiProvider, AiWorkflowResult } from "./provider.js";
import { WorkflowPayload } from "../schemas/workflowSchema.js";

const baseWorkflowTemplate = (prompt: string, nodeCatalog?: string[]): WorkflowPayload => {
  const trigger = nodeCatalog?.find((type) => type.includes("stripe")) ?? "stripe.payment_received";
  const action = nodeCatalog?.find((type) => type.includes("teams")) ?? "msteams.send_message";
  const filter = nodeCatalog?.find((type) => type.includes("filter")) ?? "filter.amount_greater_than";

  return {
    nodes: [
      {
        id: "trigger_1",
        type: trigger,
        name: "Payment received",
        config: { channel: "default", currency: "USD" },
        next: ["filter_1"],
      },
      {
        id: "filter_1",
        type: filter,
        name: "Payment threshold filter",
        config: { field: "amount", operator: ">", value: 500 },
        next: ["action_1"],
      },
      {
        id: "action_1",
        type: action,
        name: "Notify team",
        config: { teamId: "default", channelId: "general", text: "Payment received above threshold." },
      },
    ],
    triggers: [trigger],
    metadata: {
      version: 1,
      tags: ["mock", "generated"],
      summary: `Mock workflow created for: ${prompt}`,
    },
  };
};

export class MockAiProvider implements AiProvider {
  public async createWorkflowDraft(prompt: string, context?: { existingWorkflow?: WorkflowPayload; nodeCatalog?: string[]; conversationHistory?: string[] }): Promise<AiWorkflowResult> {
    const payload = baseWorkflowTemplate(prompt, context?.nodeCatalog);
    return { payload, summary: payload.metadata.summary };
  }

  public async modifyWorkflowDraft(prompt: string, currentWorkflow: WorkflowPayload, context?: { conversationHistory?: string[] }): Promise<AiWorkflowResult> {
    const payload = {
      ...currentWorkflow,
      metadata: {
        ...currentWorkflow.metadata,
        version: currentWorkflow.metadata.version + 1,
        summary: `Mock modification applied: ${prompt}`,
      },
    };

    return { payload, summary: payload.metadata.summary };
  }

  public async explainWorkflow(currentWorkflow: WorkflowPayload): Promise<AiExplanationResult> {
    return {
      explanation: `This is a mock explanation for a workflow with ${currentWorkflow.nodes.length} nodes. It starts with the '${currentWorkflow.triggers.join(", ")}' trigger and connects actions through configured nodes.`,
    };
  }
}
