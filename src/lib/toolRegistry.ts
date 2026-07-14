import { logger } from './logger.js';

/**
 * Tool definition for workflow nodes to request
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameterDef>;
    required: string[];
  };
  category?:
    | 'integration'
    | 'data_processing'
    | 'communication'
    | 'analytics'
    | 'custom';
}

export interface ToolParameterDef {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  default?: any;
}

/**
 * Tool execution request from workflow
 */
export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
  timestamp: number;
}

/**
 * Result of executing a tool
 */
export interface ToolResult {
  toolCallId: string;
  name: string;
  status: 'success' | 'error';
  result?: any;
  error?: string;
  executionTime: number;
}

/**
 * Registry for available tools that workflows can call
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private handlers: Map<string, (params: Record<string, any>) => Promise<any>> = new Map();

  /**
   * Register a tool with its handler
   */
  register(
    definition: ToolDefinition,
    handler: (params: Record<string, any>) => Promise<any>
  ): void {
    if (this.tools.has(definition.name)) {
      logger.warn('Tool already registered', { tool: definition.name });
    }
    this.tools.set(definition.name, definition);
    this.handlers.set(definition.name, handler);
    logger.info('Tool registered', { tool: definition.name, category: definition.category });
  }

  /**
   * Get tool definition
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * List all available tools, optionally filtered by category
   */
  listTools(category?: string): ToolDefinition[] {
    const tools = Array.from(this.tools.values());
    return category ? tools.filter((t) => t.category === category) : tools;
  }

  /**
   * Execute a tool call
   */
  async executeTool(call: ToolCall): Promise<ToolResult> {
    const startTime = Date.now();
    const handler = this.handlers.get(call.name);

    if (!handler) {
      const error = `Tool not found: ${call.name}`;
      logger.error(error, { toolName: call.name });
      return {
        toolCallId: call.id,
        name: call.name,
        status: 'error',
        error,
        executionTime: Date.now() - startTime,
      };
    }

    try {
      logger.info('Executing tool', {
        toolName: call.name,
        callId: call.id,
      });

      const result = await handler(call.parameters);
      const executionTime = Date.now() - startTime;

      logger.info('Tool executed successfully', {
        toolName: call.name,
        callId: call.id,
        executionTime,
      });

      return {
        toolCallId: call.id,
        name: call.name,
        status: 'success',
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Tool execution failed', {
        toolName: call.name,
        callId: call.id,
        error: errorMessage,
        executionTime,
      });

      return {
        toolCallId: call.id,
        name: call.name,
        status: 'error',
        error: errorMessage,
        executionTime,
      };
    }
  }

  /**
   * Execute multiple tool calls
   */
  async executeTools(calls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(calls.map((call) => this.executeTool(call)));
  }

  /**
   * Validate tool call parameters against definition
   */
  validateCall(call: ToolCall): { valid: boolean; errors?: string[] } {
    const tool = this.getTool(call.name);
    if (!tool) {
      return { valid: false, errors: [`Tool not found: ${call.name}`] };
    }

    const errors: string[] = [];
    const { properties, required } = tool.parameters;

    // Check required parameters
    for (const param of required) {
      if (!(param in call.parameters)) {
        errors.push(`Missing required parameter: ${param}`);
      }
    }

    // Check parameter types and values
    for (const [paramName, paramValue] of Object.entries(call.parameters)) {
      const paramDef = properties[paramName];
      if (!paramDef) {
        errors.push(`Unknown parameter: ${paramName}`);
        continue;
      }

      if (paramDef.enum && !paramDef.enum.includes(String(paramValue))) {
        errors.push(
          `Invalid enum value for ${paramName}: ${paramValue}. Expected one of: ${paramDef.enum.join(', ')}`
        );
      }
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
    this.handlers.clear();
  }

  /**
   * Get tool schema in OpenAI format for function calling
   */
  getOpenAISchema(toolName?: string): any[] {
    const tools = toolName ? [this.getTool(toolName)].filter(Boolean) : this.listTools();

    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool!.name,
        description: tool!.description,
        parameters: tool!.parameters,
      },
    }));
  }

  /**
   * Get tool schema in Claude format for function calling
   */
  getClaudeSchema(toolName?: string): any[] {
    const tools = toolName ? [this.getTool(toolName)].filter(Boolean) : this.listTools();

    return tools.map((tool) => ({
      name: tool!.name,
      description: tool!.description,
      input_schema: {
        type: 'object',
        properties: tool!.parameters.properties,
        required: tool!.parameters.required,
      },
    }));
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();

/**
 * Initialize built-in tools
 */
export function initializeBuiltInTools(): void {
  // Example: Webhook trigger tool
  toolRegistry.register(
    {
      name: 'webhook_trigger',
      description: 'Trigger a webhook URL with specified data',
      category: 'integration',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The webhook URL to trigger',
          },
          method: {
            type: 'string',
            enum: ['POST', 'PUT', 'PATCH'],
            description: 'HTTP method to use',
          },
          payload: {
            type: 'object',
            description: 'Data to send to the webhook',
          },
          timeout: {
            type: 'number',
            description: 'Request timeout in milliseconds',
            default: 5000,
          },
        },
        required: ['url', 'method', 'payload'],
      },
    },
    async (params) => {
      const { url, method, payload, timeout } = params;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout || 5000);

      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return {
          status: response.status,
          statusText: response.statusText,
          data: await response.json().catch(() => null),
        };
      } finally {
        clearTimeout(timeoutId);
      }
    }
  );

  // Example: HTTP request tool
  toolRegistry.register(
    {
      name: 'http_request',
      description: 'Make an HTTP request to an external API',
      category: 'integration',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'Request URL',
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            description: 'HTTP method',
          },
          headers: {
            type: 'object',
            description: 'Request headers',
          },
          body: {
            type: 'object',
            description: 'Request body for POST/PUT/PATCH',
          },
        },
        required: ['url', 'method'],
      },
    },
    async (params) => {
      const { url, method, headers = {}, body } = params;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        ...(body && { body: JSON.stringify(body) }),
      });

      return {
        status: response.status,
        statusText: response.statusText,
        data: await response.json().catch(() => null),
      };
    }
  );

  // Example: Data transformation tool
  toolRegistry.register(
    {
      name: 'transform_data',
      description: 'Transform data using a simple transformation rule',
      category: 'data_processing',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            description: 'Data to transform',
          },
          rule: {
            type: 'string',
            enum: ['uppercase', 'lowercase', 'reverse', 'stringify'],
            description: 'Transformation rule to apply',
          },
        },
        required: ['data', 'rule'],
      },
    },
    async (params) => {
      const { data, rule } = params;

      switch (rule) {
        case 'uppercase':
          return JSON.stringify(data).toUpperCase();
        case 'lowercase':
          return JSON.stringify(data).toLowerCase();
        case 'reverse':
          return JSON.stringify(data).split('').reverse().join('');
        case 'stringify':
          return JSON.stringify(data);
        default:
          throw new Error(`Unknown transformation rule: ${rule}`);
      }
    }
  );

  logger.info('Built-in tools initialized', {
    toolCount: toolRegistry.listTools().length,
  });
}
