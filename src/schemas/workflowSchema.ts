import { z } from "zod";

export const nodeDefinitionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  config: z.record(z.unknown()).optional().default({}),
  next: z.array(z.string()).optional(),
  conditions: z.array(z.object({ field: z.string(), operator: z.string(), value: z.unknown() })).optional(),
});

export const workflowPayloadSchema = z.object({
  nodes: z.array(nodeDefinitionSchema).min(1),
  triggers: z.array(z.string()).min(1),
  metadata: z.object({
    version: z.number().int().nonnegative(),
    tags: z.array(z.string()).optional(),
    summary: z.string().optional(),
  }),
});

export const workflowUpdateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  payload: workflowPayloadSchema,
  published: z.boolean().optional(),
});

export type WorkflowPayload = z.infer<typeof workflowPayloadSchema>;
export type WorkflowUpdate = z.infer<typeof workflowUpdateSchema>;
