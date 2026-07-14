import OpenAI from "openai";
import { config } from "../config/index.js";
import { AiProvider, AiWorkflowResult, AiExplanationResult } from "./provider.js";
import { logger } from "./logger.js";
import { WorkflowPayload } from "../schemas/workflowSchema.js";

const DEFAULT_PROMPT_TEMPLATE = `You are an AI workflow authoring assistant. Generate or modify a workflow payload in strict JSON format. Do not include explanatory text outside the JSON.

Workflow payload shape:
{
  "nodes": [
    {
      "id": "string",
      "type": "string",
      "name": "string",
      "config": { ... },
      "next": ["string"],
      "conditions": [{ "field": "string", "operator": "string", "value": "any" }]
    }
  ],
  "triggers": ["string"],
  "metadata": {
    "version": number,
    "tags": ["string"],
    "summary": "string"
  }
}

Return only valid JSON in a single code block.`;

function buildCreatePrompt(prompt: string, context?: { existingWorkflow?: WorkflowPayload; nodeCatalog?: string[]; conversationHistory?: string[] }): string {
  const lines = [DEFAULT_PROMPT_TEMPLATE, `User request: ${prompt}`];

  if (context?.conversationHistory?.length) {
    lines.push("Conversation history:");
    lines.push(context.conversationHistory.join("\n"));
  }

  if (context?.nodeCatalog) {
    lines.push(`Available node types: ${context.nodeCatalog.join(", ")}`);
  }

  if (context?.existingWorkflow) {
    lines.push(`Existing workflow JSON: ${JSON.stringify(context.existingWorkflow)}`);
  }

  return lines.join("\n\n");
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}$/);
  if (!jsonMatch) {
    return trimmed;
  }
  return jsonMatch[0];
}

export class OpenAiProvider implements AiProvider {
  private client: OpenAI;
  private modelId: string;

  constructor(apiKey?: string, modelId: string = "gpt-4") {
    const key = apiKey || config.openAiKey;
    if (!key) {
      throw new Error("OPENAI_API_KEY is required for the OpenAI provider.");
    }
    this.client = new OpenAI({ apiKey: key });
    this.modelId = modelId;
  }

  private async complete(prompt: string) {
    const response = await this.client.chat.completions.create({
      model: this.modelId,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("AI provider returned an empty response.");
    }

    return content;
  }

  private parsePayload(raw: string) {
    const jsonText = extractJson(raw);
    try {
      return JSON.parse(jsonText) as { payload: WorkflowPayload } | WorkflowPayload;
    } catch (error) {
      logger.warn("Failed to parse AI JSON output", { raw });
      throw new Error("AI output could not be parsed as JSON.");
    }
  }

  public async createWorkflowDraft(prompt: string, context?: { existingWorkflow?: WorkflowPayload; nodeCatalog?: string[] }): Promise<AiWorkflowResult> {
    const raw = await this.complete(buildCreatePrompt(prompt, context));
    const parsed = this.parsePayload(raw);
    const payload = "payload" in parsed ? parsed.payload : parsed;
    return { payload, summary: payload.metadata.summary };
  }

  public async modifyWorkflowDraft(prompt: string, currentWorkflow: WorkflowPayload): Promise<AiWorkflowResult> {
    const raw = await this.complete(buildCreatePrompt(prompt, { existingWorkflow: currentWorkflow }));
    const parsed = this.parsePayload(raw);
    const payload = "payload" in parsed ? parsed.payload : parsed;
    return { payload, summary: payload.metadata.summary };
  }

  public async explainWorkflow(currentWorkflow: WorkflowPayload): Promise<AiExplanationResult> {
    const prompt = `Explain the following workflow in plain language and highlight the trigger, the integrations, and any filters or conditions.\n\nWorkflow JSON: ${JSON.stringify(currentWorkflow)}`;
    const raw = await this.complete(prompt);
    return { explanation: raw.trim() };
  }
}
