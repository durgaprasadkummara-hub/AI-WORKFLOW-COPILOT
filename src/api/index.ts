import express from "express";
import jwtMiddleware from "../lib/auth.js";
import * as workflowController from "../controllers/workflowController.js";
import * as conversationController from "../controllers/conversationController.js";
import * as nodeCatalogController from "../controllers/nodeCatalogController.js";
import * as taskController from "../controllers/taskController.js";
import dlqController from "../controllers/dlqController.js";
import costTrackingController from "../controllers/costTrackingController.js";
import toolsController from "../controllers/toolsController.js";
import observabilityController from "../controllers/observabilityController.js";

const router = express.Router();

// Workflow endpoints
router.get("/workflows", workflowController.listWorkflows);
router.post("/workflows", jwtMiddleware(["editor", "admin"]), workflowController.createWorkflow);
router.post("/workflows/async", jwtMiddleware(["editor", "admin"]), workflowController.createWorkflowAsync);
router.get("/workflows/:workflowId", workflowController.getWorkflow);
router.patch("/workflows/:workflowId", jwtMiddleware(["editor", "admin"]), workflowController.patchWorkflow);
router.post("/workflows/:workflowId/explain", jwtMiddleware(["editor", "admin"]), workflowController.explainWorkflow);
router.post("/workflows/validate", jwtMiddleware(["editor", "admin"]), workflowController.validateWorkflow);

// Conversation endpoints
router.post("/conversations", conversationController.startConversation);
router.get("/conversations/:conversationId", conversationController.getConversation);
router.post("/conversations/:conversationId/messages", conversationController.postMessage);

// Node catalog endpoints
router.get("/nodes", nodeCatalogController.getNodeCatalog);
router.post("/nodes", nodeCatalogController.registerNode);

// Task endpoints
router.get("/tasks/:taskId", taskController.getTaskStatus);
router.get("/tasks/:taskId/subscribe", taskController.subscribeTask);

// Dead-Letter Queue endpoints
router.use("/dlq", dlqController);

// Cost tracking endpoints
router.use("/costs", costTrackingController);

// Tools endpoints
router.use("/tools", toolsController);

// Observability endpoints
router.use("/observability", observabilityController);

export default router;
