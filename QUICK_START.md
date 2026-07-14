# Quick Start Guide - Enterprise Features

## Getting Started

### 1. Setup Environment

```bash
# Navigate to backend
cd backend

# Install all dependencies (including new ones)
npm install

# Setup database with new models
npx prisma migrate dev --name "add-enterprise-features"

# Build TypeScript
npm run build

# Start development server
npm run dev
```

The server will run on **http://localhost:4001**

### 2. Verify Installation

```bash
# Health check
curl http://localhost:4001/api/observability/health

# View all available tools
curl http://localhost:4001/api/tools

# View cost summary
curl http://localhost:4001/api/costs/summary

# View Prometheus metrics
curl http://localhost:4001/api/observability/metrics
```

---

## Using Multi-Provider Support

### Switch to Claude
```bash
# Set environment variable
export AI_PROVIDER=claude
export ANTHROPIC_API_KEY=sk-ant-[your-key]

# Start server
npm run dev
```

### Switch to OpenAI
```bash
export AI_PROVIDER=openai
export OPENAI_API_KEY=sk-[your-key]
npm run dev
```

### Create Workflow with Claude
```bash
curl -X POST http://localhost:4001/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Email Campaign Workflow",
    "prompt": "Create a workflow that retrieves customer data, segments by purchase history, and sends personalized emails"
  }'
```

---

## Using Tool Calling Framework

### List Available Tools
```bash
curl http://localhost:4001/api/tools
```

Response:
```json
{
  "tools": [
    {
      "name": "webhook_trigger",
      "description": "POST data to an external webhook URL",
      "parameters": {
        "url": "string",
        "data": "object"
      }
    },
    {
      "name": "http_request",
      "description": "Make HTTP GET or POST requests",
      "parameters": {
        "url": "string",
        "method": "GET|POST",
        "headers": "object",
        "body": "object"
      }
    },
    {
      "name": "transform_data",
      "description": "Transform and filter JSON data",
      "parameters": {
        "data": "object",
        "mappings": "object"
      }
    }
  ]
}
```

### Execute a Tool
```bash
curl -X POST http://localhost:4001/api/tools/http_request/execute \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "url": "https://api.example.com/users",
      "method": "GET",
      "headers": {
        "Authorization": "Bearer token123"
      }
    }
  }'
```

### Execute Multiple Tools (Batch)
```bash
curl -X POST http://localhost:4001/api/tools/execute-batch \
  -H "Content-Type: application/json" \
  -d '{
    "tools": [
      {
        "name": "http_request",
        "parameters": {
          "url": "https://api.example.com/data",
          "method": "GET"
        }
      },
      {
        "name": "transform_data",
        "parameters": {
          "data": {},
          "mappings": {
            "id": "user.id",
            "email": "user.email"
          }
        }
      }
    ]
  }'
```

### Get Tool in Provider Format
```bash
# OpenAI function calling format
curl http://localhost:4001/api/tools/format/openai

# Claude tool calling format
curl http://localhost:4001/api/tools/format/claude
```

---

## Monitoring Dead-Letter Queue

### View DLQ Statistics
```bash
curl http://localhost:4001/api/dlq/stats
```

Response:
```json
{
  "totalMessages": 5,
  "pending": 2,
  "processing": 1,
  "completed": 1,
  "abandoned": 1,
  "totalRetries": 8,
  "avgRetries": 1.6
}
```

### List Failed Tasks
```bash
curl http://localhost:4001/api/dlq/messages
```

### Retry a Failed Task
```bash
curl -X POST http://localhost:4001/api/dlq/messages/msg-123/retry
```

### Purge Abandoned Tasks
```bash
curl -X POST http://localhost:4001/api/dlq/purge \
  -H "Content-Type: application/json" \
  -d '{"maxAgeDays": 7}'
```

---

## Tracking Costs

### View Overall Cost Summary
```bash
curl http://localhost:4001/api/costs/summary
```

Response:
```json
{
  "totalCost": 125.45,
  "costByProvider": {
    "openai": 89.23,
    "claude": 36.22
  },
  "costByModel": {
    "gpt-4": 75.50,
    "claude-3-sonnet": 36.22,
    "gpt-3.5-turbo": 13.73
  },
  "totalInputTokens": 1250000,
  "totalOutputTokens": 450000,
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31"
}
```

### View Provider Breakdown
```bash
curl http://localhost:4001/api/costs/openai
```

### View Cost Trends
```bash
curl http://localhost:4001/api/costs/trend?granularity=hourly
```

### Get Detailed Report
```bash
curl http://localhost:4001/api/costs/report
```

### Estimate Cost for Request
```bash
curl -X POST http://localhost:4001/api/costs/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "modelId": "gpt-4",
    "estimatedInputTokens": 5000,
    "estimatedOutputTokens": 2000
  }'
```

Response:
```json
{
  "provider": "openai",
  "modelId": "gpt-4",
  "estimatedInputCost": 0.15,
  "estimatedOutputCost": 0.12,
  "estimatedTotalCost": 0.27
}
```

### View Pricing Models
```bash
curl http://localhost:4001/api/costs/pricing
```

---

## Observability & Monitoring

### Circuit Breaker Status
```bash
curl http://localhost:4001/api/observability/circuit-breakers
```

Response:
```json
{
  "breakers": [
    {
      "name": "openai",
      "state": "CLOSED",
      "failureCount": 0,
      "successCount": 5,
      "lastStateChange": "2024-01-31T10:30:00Z"
    },
    {
      "name": "claude",
      "state": "HALF_OPEN",
      "failureCount": 3,
      "successCount": 1,
      "lastStateChange": "2024-01-31T10:25:00Z"
    }
  ]
}
```

### Reset Circuit Breaker
```bash
curl -X POST http://localhost:4001/api/observability/circuit-breakers/openai/reset
```

### Reset All Breakers
```bash
curl -X POST http://localhost:4001/api/observability/circuit-breakers/reset-all
```

### Prometheus Metrics Export
```bash
curl http://localhost:4001/api/observability/metrics
```

Returns Prometheus format metrics:
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",status="200"} 125

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 50
```

### Health Check with Circuit Breaker Status
```bash
curl http://localhost:4001/api/observability/health
```

If all circuit breakers CLOSED: **HTTP 200 OK**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-31T10:35:00Z",
  "circuitBreakers": {
    "openai": "CLOSED",
    "claude": "CLOSED"
  }
}
```

If any circuit breaker OPEN or HALF_OPEN: **HTTP 503 Service Unavailable**
```json
{
  "status": "degraded",
  "timestamp": "2024-01-31T10:35:00Z",
  "circuitBreakers": {
    "openai": "OPEN",
    "claude": "CLOSED"
  }
}
```

---

## Common Scenarios

### Scenario 1: Load Balancing Between Providers

```bash
# Check Claude health
curl http://localhost:4001/api/observability/circuit-breakers/claude

# If OPEN, switch to OpenAI
export AI_PROVIDER=openai

# Create workflow with OpenAI
curl -X POST http://localhost:4001/api/workflows ...
```

### Scenario 2: Cost Analysis & Optimization

```bash
# Get current costs
curl http://localhost:4001/api/costs/summary

# Compare GPT-4 vs Claude-3-Sonnet cost for request
curl -X POST http://localhost:4001/api/costs/estimate \
  -d '{"provider":"openai","modelId":"gpt-4","estimatedInputTokens":10000,"estimatedOutputTokens":5000}'

curl -X POST http://localhost:4001/api/costs/estimate \
  -d '{"provider":"claude","modelId":"claude-3-sonnet","estimatedInputTokens":10000,"estimatedOutputTokens":5000}'

# Switch to cheaper provider if needed
export AI_PROVIDER=claude
```

### Scenario 3: Failure Recovery

```bash
# Workflow fails and goes to DLQ
# Check DLQ
curl http://localhost:4001/api/dlq/stats

# View failed task
curl http://localhost:4001/api/dlq/messages/msg-123

# After fixing issue, retry
curl -X POST http://localhost:4001/api/dlq/messages/msg-123/retry

# Monitor retry status
watch -n 1 'curl http://localhost:4001/api/dlq/stats'
```

### Scenario 4: Real-Time Monitoring

```bash
# Setup Prometheus scrape
# In prometheus.yml:
# scrape_configs:
#   - job_name: 'copilot-backend'
#     static_configs:
#       - targets: ['localhost:4001']
#     metrics_path: '/api/observability/metrics'

# Or use curl to fetch metrics every 30s
watch -n 30 'curl http://localhost:4001/api/observability/metrics | head -20'
```

---

## Troubleshooting

### Circuit Breaker Keeps Opening
```bash
# Check current state
curl http://localhost:4001/api/observability/circuit-breakers

# Reset breaker to try again
curl -X POST http://localhost:4001/api/observability/circuit-breakers/[provider]/reset

# Check API key and rate limits
echo $OPENAI_API_KEY  # or ANTHROPIC_API_KEY
```

### DLQ Messages Keep Accumulating
```bash
# Check what's failing
curl http://localhost:4001/api/dlq/messages

# View error details
curl http://localhost:4001/api/dlq/messages/[msg-id]

# Purge old messages (7+ days)
curl -X POST http://localhost:4001/api/dlq/purge -d '{"maxAgeDays":7}'
```

### Tool Execution Fails
```bash
# List available tools
curl http://localhost:4001/api/tools

# Check tool schema
curl http://localhost:4001/api/tools/[tool-name]

# Verify parameters match schema
curl -X POST http://localhost:4001/api/tools/[tool-name]/execute -d '...'
```

### Costs Not Recording
```bash
# Check cost summary
curl http://localhost:4001/api/costs/summary

# Verify pricing data loaded
curl http://localhost:4001/api/costs/pricing

# Check database connection
# Verify DATABASE_URL env var
echo $DATABASE_URL
```

---

## Environment Variables Reference

```env
# Server Configuration
PORT=4001
LOG_LEVEL=info

# Database
DATABASE_URL=file:./dev.db

# AI Provider Selection
AI_PROVIDER=openai|claude|mock  # default: openai
AI_MODEL_ID=gpt-4|claude-3-opus # optional model override
FALLBACK_TO_MOCK=true           # fallback if API unavailable

# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Claude/Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-...

# Circuit Breaker (optional overrides)
CB_FAILURE_THRESHOLD=5
CB_SUCCESS_THRESHOLD=2
CB_TIMEOUT_MS=60000
CB_WINDOW_SIZE_MS=120000
```

---

## Performance Tips

1. **Use Claude for Cheaper Requests**
   - Claude 3 Haiku: ~80% cheaper than GPT-4
   - Good for simple tasks and batch operations

2. **Monitor Circuit Breaker**
   - Open circuit = provider is having issues
   - Switch to fallback provider automatically

3. **Use Tool Batch Execution**
   - More efficient than individual tool calls
   - Reduces overhead for multiple operations

4. **Cache Workflow Definitions**
   - Workflows are expensive to generate
   - Reuse generated workflows for similar tasks

5. **Track Costs Weekly**
   - Monitor spending trends
   - Alert on unusual spikes
   - Optimize expensive workflows

---

## High-Availability Setup

For production, consider:

1. **Environment Variables**
   ```bash
   FALLBACK_TO_MOCK=true          # Enable mock provider
   AI_PROVIDER=claude             # Use cheaper provider by default
   ```

2. **Multiple Instances**
   - Share database across instances
   - Circuit breakers will synchronize
   - Load balance requests

3. **Monitoring**
   - Scrape `/api/observability/metrics` with Prometheus
   - Set alerts on circuit breaker state changes
   - Track DLQ accumulation

4. **Backup Providers**
   - If OpenAI fails → try Claude
   - If Claude fails → use mock provider
   - DLQ retries automatically

---

For more details, see [ENHANCEMENTS.md](./ENHANCEMENTS.md)
