import { z } from "zod";
import prisma from "./prismaClient.js";
import { workflowPayloadSchema } from "../schemas/workflowSchema.js";
import { ValidationError } from "./errors.js";
import { ZodIssue } from "zod";

export type WorkflowValidationResult = {
  valid: boolean;
  errors: string[];
};

export async function validateWorkflowPayload(payload: unknown): Promise<WorkflowValidationResult> {
  const errors: string[] = [];
  const parseResult = workflowPayloadSchema.safeParse(payload);

  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((issue: ZodIssue) => `${issue.path.join(".")}: ${issue.message}`);
    return { valid: false, errors: issues };
  }

  const data = parseResult.data;

  const nodeIds = new Set<string>();
  const nodeTypeSet = new Set<string>();

  data.nodes.forEach((node) => {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id '${node.id}' detected.`);
    }
    nodeIds.add(node.id);
    nodeTypeSet.add(node.type);

    if (node.next) {
      node.next.forEach((nextId) => {
        if (nextId === node.id) {
          errors.push(`Node '${node.id}' cannot reference itself in next.`);
        }
      });
    }
  });

  const knownDefinitions = await prisma.nodeDefinition.findMany({
    where: { key: { in: Array.from(nodeTypeSet) } },
    select: { key: true },
  });
  const knownKeys = knownDefinitions.map((node) => node.key);

  data.nodes.forEach((node) => {
    if (!knownKeys.includes(node.type)) {
      errors.push(`Unknown node type '${node.type}'. Add the node definition first or use a supported integration.`);
    }
  });

  data.nodes.forEach((node) => {
    if (node.next) {
      node.next.forEach((nextId) => {
        if (!nodeIds.has(nextId)) {
          errors.push(`Node '${node.id}' references unknown next node '${nextId}'.`);
        }
      });
    }
  });

  if (errors.length === 0) {
    const hasCycle = detectCycle(data.nodes);
    if (hasCycle) {
      errors.push("Workflow graph contains a cycle. Workflows must be acyclic.");
    }
  }

  return { valid: errors.length === 0, errors };
}

function detectCycle(nodes: Array<{ id: string; next?: string[] }>): boolean {
  const adjacency = new Map<string, string[]>();
  nodes.forEach((node) => adjacency.set(node.id, node.next ?? []));

  const visited = new Set<string>();
  const stack = new Set<string>();

  const visit = (nodeId: string): boolean => {
    if (stack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    stack.add(nodeId);

    const children = adjacency.get(nodeId) ?? [];
    for (const child of children) {
      if (visit(child)) {
        return true;
      }
    }

    stack.delete(nodeId);
    return false;
  };

  return Array.from(adjacency.keys()).some((nodeId) => visit(nodeId));
}

export function assertWorkflowPayload(payload: unknown) {
  const result = workflowPayloadSchema.safeParse(payload);
  if (!result.success) {
    throw new ValidationError("Invalid workflow payload", result.error.format());
  }
  return result.data;
}
