import prisma from "../lib/prismaClient.js";

function parseNodeDefinition(definition: any) {
  if (!definition) return null;
  return {
    ...definition,
    inputs: JSON.parse(definition.inputs as string),
    outputs: JSON.parse(definition.outputs as string),
  };
}

export async function listNodeDefinitions() {
  const defs = await prisma.nodeDefinition.findMany({ orderBy: { createdAt: "asc" } });
  return defs.map(parseNodeDefinition);
}

export async function getNodeDefinitionByKey(key: string) {
  const definition = await prisma.nodeDefinition.findUnique({ where: { key } });
  return parseNodeDefinition(definition);
}

export async function registerNodeDefinition(data: {
  key: string;
  name: string;
  category: string;
  description?: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}) {
  const payload = {
    key: data.key,
    name: data.name,
    category: data.category,
    description: data.description,
    inputs: JSON.stringify(data.inputs),
    outputs: JSON.stringify(data.outputs),
  };
  const definition = await prisma.nodeDefinition.upsert({
    where: { key: data.key },
    update: payload,
    create: payload,
  });
  return parseNodeDefinition(definition);
}
