import prisma from "../lib/prismaClient.js";
import { WorkflowPayload } from "../schemas/workflowSchema.js";

function parseWorkflowPayload(workflow: any) {
  if (workflow?.latestVersion?.payload) {
    workflow.latestVersion.payload = JSON.parse(workflow.latestVersion.payload as string);
  }
  return workflow;
}

export async function createWorkflow(name: string, description: string | undefined, payload: WorkflowPayload) {
  const workflow = await prisma.workflow.create({
    data: {
      name,
      description,
      status: "DRAFT",
      published: false,
      versions: {
        create: {
          version: payload.metadata.version,
          payload: JSON.stringify(payload),
          summary: payload.metadata.summary,
        },
      },
    },
    include: { versions: true },
  });

  const latestVersion = workflow.versions[0];
  return parseWorkflowPayload(
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: { latestVersionId: latestVersion.id },
      include: { latestVersion: true },
    })
  );
}

export async function loadWorkflow(workflowId: string) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: { latestVersion: true },
  });
  return parseWorkflowPayload(workflow);
}

export async function updateWorkflow(workflowId: string, name: string | undefined, description: string | undefined, payload: WorkflowPayload, published?: boolean) {
  const workflow = await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      name: name ?? undefined,
      description: description ?? undefined,
      published: published ?? undefined,
      status: published ? "PUBLISHED" : "VALIDATED",
    },
    include: { latestVersion: true },
  });

  const version = await prisma.workflowVersion.create({
    data: {
      workflowId: workflow.id,
      version: payload.metadata.version,
      payload: JSON.stringify(payload),
      summary: payload.metadata.summary,
    },
  });

  return parseWorkflowPayload(
    await prisma.workflow.update({
      where: { id: workflow.id },
      data: { latestVersionId: version.id },
      include: { latestVersion: true },
    })
  );
}

export async function listWorkflows() {
  const workflows = await prisma.workflow.findMany({ include: { latestVersion: true } });
  return workflows.map(parseWorkflowPayload);
}
