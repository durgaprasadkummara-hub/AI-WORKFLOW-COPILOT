# AI Workflow Copilot Backend - Production Enhancements

## Overview

This is a **production-grade and enterprise-level** AI Workflow Copilot backend built with TypeScript, Express, and Prisma. It provides a complete workflow generation, orchestration, and execution platform with advanced features for reliability, observability, and cost management.

## Core Features

### ✅ Implemented

1. **Multi-Provider LLM Support**
   - OpenAI (GPT-4, GPT-3.5-turbo)
   - Claude (Claude 3 Opus, Sonnet, Haiku)
   - Pluggable provider architecture with fallback to mock provider
   - Dynamic model selection and configuration

2. **Tool Calling Framework**
   - Extensible tool registry with validation
   - Built-in tools: webhook triggers, HTTP requests, data transformation
   - Support for OpenAI and Claude function calling formats
   - Batch tool execution with error handling

3. **Dead-Letter Queue (DLQ)**
   - Failed task recovery with exponential backoff
   - Retry scheduling: 1m, 5m, 15m, 1h intervals
   - Automatic abandonment after max retries
   - In-memory with optional database persistence
   - Metrics and purging of abandoned tasks

4. **Circuit Breaker Pattern**
   - Per-provider failure detection
   - States: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
   - Configurable thresholds and timeouts
   - Automatic recovery testing

5. **Cost Tracking & Usage Analytics**
   - Track AI API costs per provider and model
   - Pricing for OpenAI and Claude models (Jan 2024)
   - Hourly cost trends and detailed reports
   - JSON export of usage history
   - Cost estimation for planned requests

6. **Observability & Metrics**
   - Prometheus metrics in standard format
   - HTTP request metrics (duration, size, status codes)
   - Workflow and AI request throughput
   - Task queue monitoring
   - Circuit breaker state tracking
   - Health check endpoint with aggregated status

7. **Conversation Memory**
   - Multi-turn conversation support within workflows
   - Conversation history context for AI requests
   - Message storage with role tracking
   - Framework for future RAG implementation

8. **Audit Logging**
   - Entity change tracking (workflows, conversations, tasks)
   - Action and user context capture
   - Metadata storage for detailed audits
   - Database persistence with timestamp indexing

9. **Async Task Processing**
   - Background workflow generation
   - Server-Sent Events (SSE) for real-time updates
   - Task status polling and streaming
   - Automatic error recovery with retry logic

10. **Error Handling & Validation**
    - Comprehensive error handling with custom error classes
    - Workflow payload validation with cycle detection
    - Request logging with correlation tracking
    - Structured error responses

## API Endpoints

### Workflow Management
- `POST /api/workflows` - Create workflow (sync)
- `POST /api/workflows/async` - Create workflow (async with task queue)
- `GET /api/workflows` - List workflows
- `GET /api/workflows/:id` - Get workflow details
- `PATCH /api/workflows/:id` - Modify workflow
- `POST /api/workflows/:id/explain` - Explain workflow

### Tool Management
- `GET /api/tools` - List all available tools
- `GET /api/tools/:name` - Get tool definition
- `POST /api/tools/:name/execute` - Execute single tool
- `POST /api/tools/execute-batch` - Execute multiple tools
- `GET /api/tools/format/openai` - Get tools in OpenAI format
- `GET /api/tools/format/claude` - Get tools in Claude format

### Dead-Letter Queue
- `GET /api/dlq/stats` - Get DLQ statistics
- `GET /api/dlq/messages` - List DLQ messages
- `GET /api/dlq/messages/:id` - Get specific message
- `POST /api/dlq/messages/:id/retry` - Retry failed message
- `POST /api/dlq/purge` - Purge old abandoned messages

### Cost Tracking
- `GET /api/costs/summary` - Overall cost summary
- `GET /api/costs/:provider` - Per-provider costs
- `GET /api/costs/usage/history` - Usage history
- `GET /api/costs/trend` - Cost trends over time
- `GET /api/costs/pricing` - Available pricing.
- `GET /api/costs/report` - Detailed cost report (text)
- `POST /api/costs/estimate` - Estimate cost for request

### Observability
- `GET /api/observability/circuit-breakers` - All circuit breaker metrics
- `GET /api/observability/circuit-breakers/:name` - Specific breaker metrics
- `POST /api/observability/circuit-breakers/:name/reset` - Reset breaker
- `POST /api/observability/circuit-breakers/reset-all` - Reset all breakers
- `GET /api/observability/metrics` - Prometheus metrics format
- `GET /api/observability/metrics/summary` - Metrics summary
- `GET /api/observability/health` - Health check (200/503)

## Configuration

### Environment Variables
```env
# Server
PORT=4001

# Database
DATABASE_URL=file:./dev.db

# AI Provider
AI_PROVIDER=openai|claude|mock
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL_ID=gpt-4 # optional
FALLBACK_TO_MOCK=true

# Logging
LOG_LEVEL=info
```

### Provider Configuration
```javascript
// Dynamic provider selection
import { createAiProvider, getProviderConfig } from './lib/providerLoader.js';

const provider = createAiProvider({
  type: 'claude',
  modelId: 'claude-3-sonnet',
  fallbackToMock: true
});
```

###Circuit Breaker Configuration
```javascript
const breaker = circuitBreakerRegistry.getOrCreate('openai', {
  failureThreshold: 5,      // failures before opening
  successThreshold: 2,       // successes before closing
  timeout: 60000,            // ms before half-open
  windowSize: 120000,        // ms for counting failures
});
```

## Database Schema

### Models
- **Workflow**: Workflow metadata and versioning
- **WorkflowVersion**: Workflow payload versions
- **Conversation**: Multi-turn conversation container
- **Message**: Individual messages in conversation
- **NodeDefinition**: Reusable workflow node types
- **Task**: Background async task tracking
- **DeadLetterTask**: Failed task recovery
- **CostUsage**: API usage and cost tracking
- **AuditLog**: Entity change audit trail

## Project Structure

```
src/
├── lib/
│   ├── provider.ts              # AI provider interface
│   ├── openaiProvider.ts        # OpenAI implementation
│   ├── claudeProvider.ts        # Claude implementation
│   ├── mockAiProvider.ts        # Mock implementation
│   ├── providerLoader.ts        # Provider factory
│   ├── toolRegistry.ts          # Tool calling framework
│   ├── circuitBreaker.ts        # Circuit breaker pattern
│   ├── deadLetterQueue.ts       # DLQ with retry logic
│   ├── costTracker.ts           # Cost tracking
│   ├── metrics.ts               # Prometheus metrics
│   ├── taskQueue.ts             # Async task orchestration
│   ├── requestLogger.ts         # HTTP request logging
│   ├── logger.ts                # Structured logging
│   ├── validation.ts            # Workflow validation
│   └── errors.ts                # Custom error classes
├── services/
│   ├── workflowService.ts       # Workflow business logic
│   ├── aiService.ts             # AI orchestration
│   ├── conversationService.ts   # Conversation management
│   └── nodeService.ts           # Node catalog management
├── repositories/
│   ├── workflowRepository.ts    # Workflow persistence
│   ├── conversationRepository.ts
│   ├── nodeRepository.ts
│   ├── taskRepository.ts
│   ├── auditRepository.ts       # Audit log persistence
│   └── costRepository.ts        # Cost storage
├── controllers/
│   ├── workflowController.ts
│   ├── conversationController.ts
│   ├── nodeCatalogController.ts
│   ├── taskController.ts
│   ├── toolsController.ts       # Tool management API
│   ├── dlqController.ts         # DLQ management API
│   ├── costTrackingController.ts
│   └── observabilityController.ts
├── api/
│   └── index.ts                 # Route definitions
├── app.ts                        # Express app setup
├── server.ts                     # Startup and task processing
└── config/
    └── index.ts                  # Configuration loader
```

## Running the Backend

### Development
```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev

# Build TypeScript
npm run build

# Run dev server
npm run dev
```

### Health Check
```bash
curl http://localhost:4001/api/observability/health
```

### Example: Create Workflow with Claude
```bash
curl -X POST http://localhost:4001/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Workflow",
    "prompt": "Create a workflow that monitors a Stripe subscription and sends a Slack notification"
  }'
```

### Example: Get Cost Summary
```bash
curl http://localhost:4001/api/costs/summary
```

### Example: Execute Tool
```bash
curl -X POST http://localhost:4001/api/tools/http_request/execute \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "url": "https://api.example.com/data",
      "method": "GET"
    }
  }'
```

## Monitoring & Observability

### Prometheus Metrics
Access Prometheus metrics at:
```
GET http://localhost:4001/api/observability/metrics
```

Metrics include:
- HTTP request duration and error rates
- Workflow generation metrics
- AI API request counts and durations
- Token usage by provider and model
- Task queue depth
- Circuit breaker states

### Health Checks
```
GET http://localhost:4001/api/observability/health
```

Returns circuit breaker status with 200 OK (healthy) or 503 Service Unavailable (degraded).

## Production Best Practices

1. **Rate Limiting**: Implement API rate limiting on provider calls
2. **Backup Storage**: Configure persistent task queue storage
3. **Monitoring**: Set up alerts on circuit breaker states and cost thresholds
4. **Logging**: Aggregate logs to central logging service
5. **Testing**: Run comprehensive tests before deployment
6. **Secrets**: Use environment variable management for API keys
7. **Scaling**: Deploy multiple instances with shared database

## Error Handling

All errors follow a consistent format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "context": {}
}
```

DLQ automatically retries failures with exponential backoff before abandonment.

## Future Enhancements

- Event sourcing for full audit trail
- Prompt versioning and A/B testing
- Operation-based workflow editing (reverse/patch operations)
- Agentic planning with autonomous task decomposition
- RAG infrastructure with semantic search
- Idempotent job processing with fingerprinting
- Advanced cost optimization based on usage patterns
- ML-based workflow recommendations
- GraphQL API layer
- Workflow templates and marketplace

## License

ISC

## Support

For issues or questions, please open an issue on the repository.
