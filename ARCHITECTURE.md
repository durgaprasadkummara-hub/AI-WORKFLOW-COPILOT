# Architecture & Design Decisions

## System Overview

The AI Workflow Copilot backend implements a **production-grade, enterprise-level** architecture optimized for reliability, cost efficiency, and observability in AI-driven workflow generation and orchestration.

```
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Express)                         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Workflows  │  │ Conversations│  │  Tools & Orchestration│   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Cost Tracking│  │  DLQ Manager │  │   Observability      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              AI Service Orchestration                   │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐   │    │
│  │  │  OpenAI P.   │  │  Claude P.   │  │  Mock P.    │   │    │
│  │  └──────────────┘  └──────────────┘  └─────────────┘   │    │
│  │         ↓               ↓                  ↓            │    │
│  │  ┌────────────────────────────────────────────────┐     │    │
│  │  │ Circuit Breaker (Per-Provider Fault Tolerance)│     │    │
│  │  └────────────────────────────────────────────────┘     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          ↓                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Tool Registry & Execution (Built-in + Custom)         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          ↓                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Dead-Letter Queue (Task Recovery & Retry Logic)       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
       ↓                    ↓                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Cross-Cutting Concerns                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Metrics (Prometheus)  │  Cost Tracking  │  Audit Logs   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────────────────────┐
│                 Data Layer (Prisma + SQLite)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Workflows   │  │ Conversations│  │  Tasks & DLQ         │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │Cost Tracking │  │ Node Catalog │  │  Audit Logs          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design Decisions & Rationale

### 1. Multi-Provider LLM Support

**Decision**: Support OpenAI and Claude with pluggable provider architecture

**Rationale**:
- **Vendor Lock-in Prevention**: Avoid dependency on single LLM provider
- **Cost Optimization**: Different models have different pricing; choose optimal provider per use case
- **Reliability**: If one provider experiences outages, fall back to another
- **Future Extensibility**: Easy to add more providers (Cohere, Llama, etc.)

**Implementation Details**:
```
AiProvider Interface (Abstract)
    ↓
    ├─ OpenAI Implementation
    ├─ Claude Implementation
    └─ Mock Implementation

ProviderLoader (Factory Pattern)
    ├─ Dynamic selection via AI_PROVIDER env var
    ├─ Model ID configuration (AI_MODEL_ID)
    └─ Fallback chain: Preferred → Mock
```

**Trade-offs**:
- ✅ Added flexibility and reliability
- ❌ Slightly higher code complexity
- ❌ Need to maintain parity across providers

---

### 2. Circuit Breaker Pattern

**Decision**: Implement per-provider circuit breaker for fault tolerance

**Rationale**:
- **Cascading Failures**: Prevent hammering failing provider with requests
- **Resource Protection**: Stop wasting API quota on doomed requests
- **Automatic Recovery**: Half-open state allows testing recovery
- **Observable**: Track failures and recovery attempts

**State Machine**:
```
CLOSED (Normal Operation)
    └─ 5 consecutive failures → OPEN
    
OPEN (Provider Failing)
    └─ 60 seconds elapsed → HALF_OPEN
    
HALF_OPEN (Testing Recovery)
    ├─ 2 successes → CLOSED
    └─ 1 failure → OPEN
```

**Metrics Tracked**:
- Failure count (request failures)
- Success count (recovery attempts succeeding)
- State transitions
- Last state change time

**Trade-offs**:
- ✅ Prevents cascading failures
- ✅ Automatic recovery testing
- ❌ May reject some valid requests during OPEN state
- ❌ Requires monitoring to avoid prolonged OPEN state

---

### 3. Dead-Letter Queue (DLQ) with Retry Logic

**Decision**: Implement exponential backoff retry with automatic abandonment

**Rationale**:
- **Transient Failures**: Network blips, rate limits, temporary outages
- **Observability**: Track failed tasks for debugging
- **Recovery**: Automatic retries without human intervention
- **Fairness**: Exponential backoff prevents overwhelming recovering services

**Retry Schedule**:
```
Attempt 1 → Fail (immediately)
         ↓
1 minute → Attempt 2
       (fail)
         ↓
5 minutes → Attempt 3
        (fail)
         ↓
15 minutes → Attempt 4
         (fail)
         ↓
1 hour → Abandoned (manual investigation)
```

**States**:
- `pending`: Waiting for next retry window
- `processing`: Currently being retried
- `completed`: Successfully recovered
- `abandoned`: Max retries exceeded (investigate manually)

**Storage**:
- In-memory queue for fast access
- Optional Prisma persistence for durability
- Automatic purge of abandoned tasks after retention window

**Trade-offs**:
- ✅ Recovers transient failures automatically
- ✅ Prevents overwhelming services with immediate retries
- ❌ May delay recovery by up to 1 hour
- ❌ Requires monitoring to catch abandoned tasks

---

### 4. Cost Tracking & Optimization

**Decision**: Track usage and costs per provider/model with trend analysis

**Rationale**:
- **Budget Control**: Monitor spending across multiple providers
- **Optimization**: Identify expensive workflows and optimize
- **Forecasting**: Predict monthly costs and detect anomalies
- **Accountability**: Charge back to departments/projects by usage

**Pricing Model** (as of Jan 2024):
```
OpenAI:
  GPT-4:        $0.03/$0.06 per 1k tokens
  GPT-3.5:      $0.0005/$0.0015 per 1k tokens

Claude (Anthropic):
  Claude 3 Opus:      $0.015/$0.075 per 1k tokens
  Claude 3 Sonnet:    $0.003/$0.015 per 1k tokens
  Claude 3 Haiku:     $0.00025/$0.00125 per 1k tokens
```

**Analytics Available**:
- Total cost by provider
- Cost by model
- Hourly/daily trends
- Cost estimation for planned requests
- JSON export for BI systems

**Storage**:
- CostUsage model in database
- Timestamp-based indexing for quick queries
- Automatic aggregation for reports

**Trade-offs**:
- ✅ Enables cost optimization decisions
- ✅ Prevents unexpected billing
- ❌ Requires accurate usage tracking from LLM APIs
- ❌ Pricing changes require manual updates

---

### 5. Tool Calling Framework

**Decision**: Implement extensible tool registry with provider-agnostic execution

**Rationale**:
- **Decoupling**: Separate tool definition from provider-specific formats
- **Extensibility**: Add new tools without modifying core code
- **Provider Compatibility**: Support both OpenAI and Claude function calling
- **Validation**: Ensure parameters match schema before execution

**Design Pattern**:
```
ToolDefinition (Interface)
    ├─ name: string
    ├─ description: string
    └─ parameters: {
         type: "object",
         properties: {...},
         required: [...]
       }

ToolRegistry (Singleton)
    ├─ register(tool): void
    ├─ getTool(name): ToolDefinition
    ├─ listTools(): ToolDefinition[]
    ├─ executeTool(name, params): Promise
    └─ export methods for OpenAI/Claude formats

Built-in Tools:
    ├─ webhook_trigger: POST to external URL
    ├─ http_request: Flexible HTTP client
    └─ transform_data: JSON transformation/filtering
```

**Provider Format Export**:
- OpenAI: `function` object with `name`, `description`, `parameters`
- Claude: `tool` object with `name`, `description`, `input_schema`

**Trade-offs**:
- ✅ Provider-agnostic tool definitions
- ✅ Easy to add new tools
- ❌ Requires understanding each provider's function calling format
- ❌ Some provider-specific features may not translate

---

### 6. Observability & Prometheus Metrics

**Decision**: Implement Prometheus metrics across all layers

**Rationale**:
- **Standard Format**: Prometheus is industry standard for monitoring
- **Querying**: Flexible queries for dashboards (Grafana)
- **Alerting**: Threshold-based alerts (high error rates, circuit breakers)
- **Custom Metrics**: Application-specific metrics beyond HTTP

**Metrics Categories**:

1. **HTTP Metrics**
   - `http_requests_total`: Request count by method/path/status
   - `http_request_duration_seconds`: Latency distribution
   - `http_response_size_bytes`: Response payload sizes

2. **Workflow Metrics**
   - `workflows_total`: Workflows created count
   - `workflow_generation_duration_seconds`: How long generation takes
   - `workflow_generation_errors_total`: Failed generations

3. **AI API Metrics**
   - `ai_requests_total`: API calls by provider/model
   - `ai_request_duration_seconds`: API response times
   - `ai_tokens_used_total`: Token usage by provider/model
   - `ai_request_errors_total`: API errors

4. **Task Queue Metrics**
   - `tasks_processed_total`: Task execution count
   - `task_processing_duration_seconds`: Per-task duration
   - `task_queue_depth`: Pending task count
   - `task_errors_total`: Task failure count

5. **Circuit Breaker Metrics**
   - `circuit_breaker_state`: Current state (0=CLOSED, 1=OPEN, 2=HALF_OPEN)
   - `circuit_breaker_transitions_total`: State change count
   - `circuit_breaker_failures_total`: Failure count

**Storage**: In-memory Prometheus registry, exportable as text format

**Trade-offs**:
- ✅ Industry standard, widely supported
- ✅ Enables sophisticated alerting
- ❌ Requires separate Prometheus server for storage
- ❌ Cardinality explosion risk with high-dimensional data

---

### 7. Database Schema Design

**Decision**: Extend existing schema with DeadLetterTask and CostUsage models

**Rationale**:
- **Durability**: Persist failed tasks and cost data to database
- **Auditability**: Keep historical cost records
- **Recovery**: Survive process restarts
- **Querying**: Complex analysis queries not feasible in-memory

**New Models**:

1. **DeadLetterTask**
   - Stores failed workflow requests
   - Tracks retry attempts and errors
   - Indexed by status and nextRetryAt for efficient queries

2. **CostUsage**
   - Records per-request token usage and costs
   - Enables trend analysis and forecasting
   - Indexed by timestamp for time-series queries

**Migration Strategy**:
- `prisma migrate dev`: Creates new tables
- Backward compatible: Existing functionality unchanged
- Optional persistence: Code works with or without data

**Trade-offs**:
- ✅ Durable storage for recovery
- ✅ Enables complex analytics
- ❌ Adds database I/O overhead
- ❌ Requires schema migration

---

### 8. Error Handling Strategy

**Decision**: Layered error handling with specific error types and recovery

**Rationale**:
- **Debugging**: Different error types need different fixes
- **Recovery**: Some errors are transient, some permanent
- **User Feedback**: Meaningful error messages for API consumers
- **Monitoring**: Track error distribution for alerting

**Error Categories**:

1. **Provider Errors** (Transient → DLQ)
   - Rate limit exceeded → Retry later
   - Temporary outage → Retry later
   - Invalid API key → Fallback provider

2. **Validation Errors** (Permanent)
   - Invalid workflow structure → Fix and resubmit
   - Missing required parameters → Reject immediately

3. **System Errors** (Investigate)
   - Database connection failed → Service unavailable (503)
   - Out of memory → Service unavailable (503)

**Response Format**:
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "context": {
    "provider": "openai",
    "attempt": 1,
    "willRetry": true
  }
}
```

**Trade-offs**:
- ✅ Clear, actionable error messages
- ✅ Enables automated recovery decisions
- ❌ Requires careful categorization
- ❌ Some errors can be ambiguous

---

### 9. Multi-Turn Conversation Memory

**Decision**: Store conversation history with role-based message tracking

**Rationale**:
- **Context**: AI models need previous conversation context
- **Quality**: Better responses when AI understands conversation history
- **Audit**: Track who said what for accountability
- **Analytics**: Analyze conversation patterns

**Storage Structure**:
```
Conversation (Container)
    └─ message[] (Ordered by timestamp)
        ├─ role: "user" | "assistant" | "system"
        ├─ content: string
        └─ metadata: {name, context, ...}
```

**Use Cases**:
- Multi-turn workflow refinement
- Context-aware workflow generation
- Conversation-based audit trail
- Foundation for RAG (Retrieval-Augmented Generation)

**Trade-offs**:
- ✅ Richer context for AI models
- ✅ Audit trail for compliance
- ❌ Increases prompt size, impacts cost
- ❌ Adds complexity to workflow execution

---

### 10. Asynchronous Task Processing

**Decision**: Separate sync and async workflow creation paths

**Rationale**:
- **Performance**: Don't block HTTP request on slow generation
- **Scalability**: Process multiple generations in parallel
- **UX**: Return task ID immediately, poll for status
- **Recovery**: Failed tasks go to DLQ for retry

**Architecture**:
```
Client Request (POST /workflows or /workflows/async)
    ↓
    ├─ Sync Path: Return workflow immediately (if fast)
    └─ Async Path: Return task ID, process in background
        ↓
    Task Queue (In-memory or Job Queue)
        ↓
    Worker Process
        ├─ Generate workflow
        ├─ Record cost
        └─ Update task status
            ├─ Success → Mark completed
            └─ Failure → Add to DLQ
        ↓
    SSE or Polling (Client checks status)
```

**Trade-offs**:
- ✅ Better UX for slow generations
- ✅ Enables backpressure and prioritization
- ❌ More complex code (async/await)
- ❌ Requires status polling or SSE

---

## Design Principles

### 1. **Reliability Over Speed**
- Retry failed requests automatically
- Use circuit breakers to prevent cascading failures
- Persistent task queue survives crashes

### 2. **Observability Over Assumptions**
- Metrics everywhere (HTTP, AI, tasks, cost)
- Health checks expose circuit breaker state
- Detailed error messages for debugging

### 3. **Cost Efficiency During Operation**
- Track usage and costs per request
- Enable provider switching for optimization
- Historical analysis for forecasting

### 4. **Extensibility Over Rigidity**
- Plugin architecture for providers
- Tool registry for new capabilities
- Custom error handling for application logic

### 5. **Failover Over Failure**
- Switch providers when one fails
- Retry with exponential backoff
- Fallback to mock provider if available

---

## Trade-Offs Summary

| Component | Benefit | Cost |
|-----------|---------|------|
| **Multi-Provider** | Vendor independence, cost optimization | Code complexity |
| **Circuit Breaker** | Prevents cascades, automatic recovery | May reject valid requests |
| **DLQ with Retry** | Transient failure recovery | Up to 1 hour delay |
| **Cost Tracking** | Budget control, optimization | Database overhead |
| **Tool Registry** | Extensibility, provider agnostic | Abstraction layer complexity |
| **Prometheus** | Industry standard, alerting | Requires external infra |
| **Conversation Memory** | Better context, audit trail | Increased prompt size/cost |
| **Async Tasks** | Better UX, parallelization | Client complexity |

---

## Monitoring & Alerting Recommendations

### Critical Alerts
1. **Circuit Breaker Open** → `circuit_breaker_state == 1`
2. **High Error Rate** → Request error percentage > 5%
3. **DLQ Backing Up** → `tasks_dlq_abandoned > 10`
4. **Cost Spike** → Daily cost > 150% of 30-day average

### Performance Alerts
1. **High Latency** → P95 response time > 5 seconds
2. **Task Queue Depth** → Pending tasks > 100
3. **Circuit Breaker Half-Open** → State changing frequently

### Informational Metrics
1. Daily cost trend
2. Provider usage distribution
3. Tool execution frequency
4. Conversation length distribution

---

## Future Enhancements (Roadmap)

### Phase 1: Advanced Observability
- Distributed tracing (OpenTelemetry)
- Custom dashboards (Grafana templates)
- Anomaly detection on metric trends

### Phase 2: Cost Optimization
- Cost-based provider selection (automatic)
- Model downgrading for non-critical tasks
- Caching of repeated requests

### Phase 3: Agentic Planning
- Task decomposition (break down complex workflows)
- Autonomous error recovery
- Multi-step reasoning and planning

### Phase 4: Knowledge Management
- RAG (Retrieval-Augmented Generation)
- Semantic search over past workflows
- Workflow templates and marketplace

### Phase 5: Data Persistence
- Event sourcing (full event log)
- Prompt versioning and A/B testing
- Operation-based workflow editing (reverse/patch)

---

## Conclusion

The AI Workflow Copilot backend combines enterprise-grade reliability patterns (circuit breaker, DLQ, retry logic) with modern observability (Prometheus) and cost management capabilities. The architecture prioritizes operational resilience while maintaining code simplicity and extensibility.

Key design decision: **Fail fast, recover slow** - detect problems immediately (circuit breaker), then recover gracefully (DLQ with backoff) rather than accepting continued failures or giving up immediately.
