import { getNodeDefinitionByKey, listNodeDefinitions, registerNodeDefinition } from "../repositories/nodeCatalogRepository.js";

export async function getNodeCatalog() {
  return listNodeDefinitions();
}

export async function addNodeDefinition(data: {
  key: string;
  name: string;
  category: string;
  description?: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}) {
  return registerNodeDefinition(data);
}

export async function getNodeDefinition(key: string) {
  return getNodeDefinitionByKey(key);
}
