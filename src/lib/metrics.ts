import * as promClient from 'prom-client';
import { logger } from './logger.js';

/**
 * Prometheus metrics for observability
 */
class MetricsCollector {
  // HTTP metrics
  private httpRequestDuration: promClient.Histogram;
  private httpRequestTotal: promClient.Counter;
  private httpRequestSize: promClient.Histogram;
  private httpResponseSize: promClient.Histogram;

  // Workflow metrics
  private workflowsCreated: promClient.Counter;
  private workflowsCompleted: promClient.Counter;
  private workflowsFailed: promClient.Counter;
  private workflowDuration: promClient.Histogram;

  // AI API metrics
  private aiRequestsTotal: promClient.Counter;
  private aiRequestDuration: promClient.Histogram;
  private aiTokensUsed: promClient.Counter;
  private aiCostTotal: promClient.Gauge;
  private aiErrorsTotal: promClient.Counter;

  // Task queue metrics
  private taskQueueSize: promClient.Gauge;
  private tasksProcessed: promClient.Counter;
  private taskProcessingDuration: promClient.Histogram;

  // Circuit breaker metrics
  private circuitBreakerState: promClient.Gauge;
  private circuitBreakerTrips: promClient.Counter;

  constructor() {
    // Set up default metrics
    promClient.collectDefaultMetrics();

    // HTTP metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_ms',
      help: 'Duration of HTTP requests in milliseconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [10, 50, 100, 500, 1000, 5000],
    });

    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.httpRequestSize = new promClient.Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000],
    });

    this.httpResponseSize = new promClient.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status'],
      buckets: [100, 1000, 10000, 100000],
    });

    // Workflow metrics
    this.workflowsCreated = new promClient.Counter({
      name: 'workflows_created_total',
      help: 'Total number of workflows created',
      labelNames: ['source'],
    });

    this.workflowsCompleted = new promClient.Counter({
      name: 'workflows_completed_total',
      help: 'Total number of workflows completed',
      labelNames: ['status'],
    });

    this.workflowsFailed = new promClient.Counter({
      name: 'workflows_failed_total',
      help: 'Total number of workflows that failed',
      labelNames: ['reason'],
    });

    this.workflowDuration = new promClient.Histogram({
      name: 'workflow_duration_ms',
      help: 'Duration of workflow execution in milliseconds',
      labelNames: ['type'],
      buckets: [100, 500, 1000, 5000, 10000, 30000],
    });

    // AI API metrics
    this.aiRequestsTotal = new promClient.Counter({
      name: 'ai_requests_total',
      help: 'Total number of AI API requests',
      labelNames: ['provider', 'model', 'operation'],
    });

    this.aiRequestDuration = new promClient.Histogram({
      name: 'ai_request_duration_ms',
      help: 'Duration of AI requests in milliseconds',
      labelNames: ['provider', 'model'],
      buckets: [100, 500, 1000, 5000, 10000, 30000],
    });

    this.aiTokensUsed = new promClient.Counter({
      name: 'ai_tokens_used_total',
      help: 'Total number of tokens used in AI requests',
      labelNames: ['provider', 'model', 'type'],
    });

    this.aiCostTotal = new promClient.Gauge({
      name: 'ai_cost_total',
      help: 'Total cost of AI API usage in dollars',
      labelNames: ['provider'],
    });

    this.aiErrorsTotal = new promClient.Counter({
      name: 'ai_errors_total',
      help: 'Total number of AI API errors',
      labelNames: ['provider', 'model', 'error_type'],
    });

    // Task queue metrics
    this.taskQueueSize = new promClient.Gauge({
      name: 'task_queue_size',
      help: 'Current size of the task queue',
      labelNames: ['queue_name'],
    });

    this.tasksProcessed = new promClient.Counter({
      name: 'tasks_processed_total',
      help: 'Total number of tasks processed',
      labelNames: ['task_type', 'status'],
    });

    this.taskProcessingDuration = new promClient.Histogram({
      name: 'task_processing_duration_ms',
      help: 'Duration of task processing in milliseconds',
      labelNames: ['task_type'],
      buckets: [100, 500, 1000, 5000, 10000, 30000],
    });

    // Circuit breaker metrics
    this.circuitBreakerState = new promClient.Gauge({
      name: 'circuit_breaker_state',
      help: 'State of circuit breaker (0=closed, 1=open, 2=half-open)',
      labelNames: ['breaker_name'],
    });

    this.circuitBreakerTrips = new promClient.Counter({
      name: 'circuit_breaker_trips_total',
      help: 'Total number of times circuit breaker was opened',
      labelNames: ['breaker_name'],
    });

    logger.info('Metrics collector initialized');
  }

  // HTTP metrics
  recordHttpRequest(
    method: string,
    route: string,
    status: number,
    duration: number,
    requestSize?: number,
    responseSize?: number
  ): void {
    this.httpRequestDuration.labels(method, route, String(status)).observe(duration);
    this.httpRequestTotal.labels(method, route, String(status)).inc();
    if (requestSize) {
      this.httpRequestSize.labels(method, route).observe(requestSize);
    }
    if (responseSize) {
      this.httpResponseSize.labels(method, route, String(status)).observe(responseSize);
    }
  }

  // Workflow metrics
  recordWorkflowCreated(source: string = 'api'): void {
    this.workflowsCreated.labels(source).inc();
  }

  recordWorkflowCompleted(status: string = 'success'): void {
    this.workflowsCompleted.labels(status).inc();
  }

  recordWorkflowFailed(reason: string = 'error'): void {
    this.workflowsFailed.labels(reason).inc();
  }

  recordWorkflowDuration(type: string, duration: number): void {
    this.workflowDuration.labels(type).observe(duration);
  }

  // AI API metrics
  recordAiRequest(
    provider: string,
    model: string,
    operation: string,
    duration: number
  ): void {
    this.aiRequestsTotal.labels(provider, model, operation).inc();
    this.aiRequestDuration.labels(provider, model).observe(duration);
  }

  recordAiTokens(
    provider: string,
    model: string,
    type: 'input' | 'output',
    count: number
  ): void {
    this.aiTokensUsed.labels(provider, model, type).inc(count);
  }

  recordAiCost(provider: string, costDelta: number): void {
    this.aiCostTotal.labels(provider).inc(costDelta);
  }

  recordAiError(provider: string, model: string, errorType: string): void {
    this.aiErrorsTotal.labels(provider, model, errorType).inc();
  }

  // Task queue metrics
  setTaskQueueSize(queueName: string, size: number): void {
    this.taskQueueSize.labels(queueName).set(size);
  }

  recordTaskProcessed(taskType: string, status: string = 'completed'): void {
    this.tasksProcessed.labels(taskType, status).inc();
  }

  recordTaskProcessingDuration(taskType: string, duration: number): void {
    this.taskProcessingDuration.labels(taskType).observe(duration);
  }

  // Circuit breaker metrics
  recordCircuitBreakerState(breakerName: string, state: 'closed' | 'open' | 'half_open'): void {
    const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2;
    this.circuitBreakerState.labels(breakerName).set(stateValue);
  }

  recordCircuitBreakerTrip(breakerName: string): void {
    this.circuitBreakerTrips.labels(breakerName).inc();
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return await promClient.register.metrics();
  }

  /**
   * Get metrics as JSON
   */
  getMetricsAsJSON(): Record<string, any> {
    const metrics = promClient.register.getMetricsAsArray();
    // Simplified version - returns basic stats
    return {
      http_requests: this.httpRequestTotal,
      workflows_created: this.workflowsCreated,
      ai_requests: this.aiRequestsTotal,
      tasks_processed: this.tasksProcessed,
    };
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

/**
 * Middleware to record HTTP metrics
 */
export function metricsMiddleware(req: any, res: any, next: any): void {
  const startTime = Date.now();
  const startSize = req.socket.bytesRead || 0;

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function (...args: any[]): any {
    const duration = Date.now() - startTime;
    const responseSize = res.socket.bytesWritten - startSize;

    metricsCollector.recordHttpRequest(
      req.method,
      req.path || req.route,
      res.statusCode,
      duration,
      Buffer.byteLength(JSON.stringify(req.body || {})),
      responseSize
    );

    return originalEnd.apply(res, args);
  };

  next();
}
