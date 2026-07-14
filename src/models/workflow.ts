export type WorkflowNode = {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  next?: string[];
  conditions?: Array<{ field: string; operator: string; value: unknown }>;
};

export type WorkflowPayload = {
  nodes: WorkflowNode[];
  triggers: string[];
  metadata: {
    version: number;
    tags?: string[];
    summary?: string;
  };
};

export type WorkflowRecord = {
  id: string;
  name: string;
  description?: string;
  status: string;
  published: boolean;
  payload: WorkflowPayload;
  version: number;
  createdAt: string;
  updatedAt: string;
};
