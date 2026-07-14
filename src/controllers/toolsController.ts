import { Router, Request, Response } from 'express';
import { toolRegistry, initializeBuiltInTools } from '../lib/toolRegistry.js';
import { logger } from '../lib/logger.js';

const router = Router();

// Initialize built-in tools on startup
initializeBuiltInTools();

/**
 * Get tools in OpenAI format for function calling
 * NOTE: Must be before /:toolName to avoid wildcard matching "format"
 */
router.get('/format/openai', (_req: Request, res: Response) => {
  try {
    const schema = toolRegistry.getOpenAISchema();
    res.json({
      status: 'ok',
      data: schema,
    });
  } catch (error) {
    logger.error('Failed to get OpenAI schema', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get OpenAI schema',
    });
  }
});

/**
 * Get tools in Claude format for function calling
 * NOTE: Must be before /:toolName to avoid wildcard matching "format"
 */
router.get('/format/claude', (_req: Request, res: Response) => {
  try {
    const schema = toolRegistry.getClaudeSchema();
    res.json({
      status: 'ok',
      data: schema,
    });
  } catch (error) {
    logger.error('Failed to get Claude schema', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get Claude schema',
    });
  }
});

/**
 * Batch execute tools
 * NOTE: Must be before /:toolName to avoid wildcard matching "execute-batch"
 */
router.post('/execute-batch', async (req: Request, res: Response) => {
  try {
    const { calls } = req.body;

    if (!Array.isArray(calls)) {
      return res.status(400).json({
        error: 'Expected array of tool calls',
      });
    }

    // Add IDs and timestamps if missing
    const toolCalls = calls.map((call: any, i: number) => ({
      id: call.id || `call_${Date.now()}_${i}`,
      name: call.name,
      parameters: call.parameters,
      timestamp: Date.now(),
    }));

    // Validate all calls
    const validations = toolCalls.map((call) => toolRegistry.validateCall(call));
    const invalidCalls = validations.filter((v) => !v.valid);

    if (invalidCalls.length > 0) {
      return res.status(400).json({
        error: 'Some tool calls are invalid',
        details: invalidCalls,
      });
    }

    // Execute all tools
    const results = await toolRegistry.executeTools(toolCalls);

    res.json({
      status: 'ok',
      results,
      summary: {
        total: results.length,
        successful: results.filter((r) => r.status === 'success').length,
        failed: results.filter((r) => r.status === 'error').length,
      },
    });
  } catch (error) {
    logger.error('Failed to batch execute tools', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to batch execute tools',
    });
  }
});

/**
 * List all available tools
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const tools = toolRegistry.listTools((category as string) || undefined);

    res.json({
      status: 'ok',
      data: tools.map((t) => ({
        name: t.name,
        description: t.description,
        category: t.category,
        parameters: t.parameters,
      })),
      total: tools.length,
    });
  } catch (error) {
    logger.error('Failed to list tools', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to list tools',
    });
  }
});

/**
 * Get specific tool definition
 * NOTE: Wildcard route — must be after literal paths above
 */
router.get('/:toolName', (req: Request, res: Response) => {
  try {
    const { toolName } = req.params;
    const tool = toolRegistry.getTool(toolName);

    if (!tool) {
      return res.status(404).json({
        error: `Tool not found: ${toolName}`,
      });
    }

    res.json({
      status: 'ok',
      data: {
        name: tool.name,
        description: tool.description,
        category: tool.category,
        parameters: tool.parameters,
      },
    });
  } catch (error) {
    logger.error('Failed to get tool', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get tool',
    });
  }
});

/**
 * Execute a tool
 */
router.post('/:toolName/execute', async (req: Request, res: Response) => {
  try {
    const { toolName } = req.params;
    const { parameters } = req.body;

    if (!parameters) {
      return res.status(400).json({
        error: 'Missing parameters in request body',
      });
    }

    // Validate parameters
    const toolCall = {
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: toolName,
      parameters,
      timestamp: Date.now(),
    };

    const validation = toolRegistry.validateCall(toolCall);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: validation.errors,
      });
    }

    // Execute tool
    const result = await toolRegistry.executeTool(toolCall);

    if (result.status === 'error') {
      return res.status(400).json({
        result,
      });
    }

    res.json({
      status: 'ok',
      result,
    });
  } catch (error) {
    logger.error('Failed to execute tool', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to execute tool',
    });
  }
});

export default router;
