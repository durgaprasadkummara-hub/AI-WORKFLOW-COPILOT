import { Request, Response } from "express";
import * as nodeCatalogService from "../services/nodeCatalogService.js";

export async function getNodeCatalog(req: Request, res: Response) {
  const nodes = await nodeCatalogService.getNodeCatalog();
  return res.json(nodes);
}

export async function registerNode(req: Request, res: Response) {
  const { key, name, category, description, inputs, outputs } = req.body;
  if (!key || !name || !category || !inputs || !outputs) {
    return res.status(400).json({ error: "Missing required node definition fields." });
  }
  const node = await nodeCatalogService.addNodeDefinition({ key, name, category, description, inputs, outputs });
  return res.status(201).json(node);
}
