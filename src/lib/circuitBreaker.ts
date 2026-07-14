import { logger } from './logger.js';

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  failureThreshold?: number; // Number of failures before opening (default: 5)
  successThreshold?: number; // Number of successes before closing (default: 2)
  timeout?: number; // Time in ms before transitioning to half-open (default: 60000)
  windowSize?: number; // Time window for counting failures in ms (default: 120000)
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  consecutiveFailures: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  openedAt?: Date;
}

/**
 * Circuit Breaker pattern for handling API failures and rate limits
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests rejected immediately
 * - HALF_OPEN: Testing if service recovered, limiting requests
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount: number = 0;
  private successCount: number = 0;
  private consecutiveFailures: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private openedAt?: Date;
  private failureTimes: number[] = [];

  private failureThreshold: number;
  private successThreshold: number;
  private timeout: number;
  private windowSize: number;

  constructor(
    private name: string,
    config: CircuitBreakerConfig = {}
  ) {
    this.failureThreshold = config.failureThreshold || 5;
    this.successThreshold = config.successThreshold || 2;
    this.timeout = config.timeout || 60000;
    this.windowSize = config.windowSize || 120000;

    logger.info('Circuit breaker created', {
      name,
      failureThreshold: this.failureThreshold,
      successThreshold: this.successThreshold,
      timeout: this.timeout,
    });
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half_open';
        logger.info('Circuit breaker transitioning to half-open', { name: this.name });
      } else {
        throw new Error(`Circuit breaker "${this.name}" is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }

  /**
   * Record a successful execution
   */
  private recordSuccess(): void {
    this.totalRequests++;
    this.successCount++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = new Date();

    logger.debug('Circuit breaker success', {
      name: this.name,
      state: this.state,
      successCount: this.successCount,
    });

    if (this.state === 'half_open') {
      if (this.successCount >= this.successThreshold) {
        this.closeCircuit();
      }
    } else if (this.state === 'closed') {
      // In normal operation, reset counts periodically
      this.cleanupOldFailures();
    }
  }

  /**
   * Record a failed execution
   */
  private recordFailure(error: any): void {
    this.totalRequests++;
    this.failureCount++;
    this.consecutiveFailures++;
    this.lastFailureTime = new Date();
    this.failureTimes.push(Date.now());

    logger.warn('Circuit breaker failure', {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      consecutiveFailures: this.consecutiveFailures,
      error:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error),
    });

    if (this.state === 'half_open') {
      // Any failure in half-open state reopens
      this.openCircuit();
    } else if (this.state === 'closed') {
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.openCircuit();
      }
    }
  }

  /**
   * Open the circuit, rejecting all requests
   */
  private openCircuit(): void {
    if (this.state !== 'open') {
      this.state = 'open';
      this.openedAt = new Date();
      this.successCount = 0;
      logger.error('Circuit breaker OPENED', {
        name: this.name,
        failureCount: this.failureCount,
        consecutiveFailures: this.consecutiveFailures,
        timeout: this.timeout,
      });
    }
  }

  /**
   * Close the circuit, resuming normal operation
   */
  private closeCircuit(): void {
    if (this.state !== 'closed') {
      this.state = 'closed';
      this.failureCount = 0;
      this.successCount = 0;
      this.consecutiveFailures = 0;
      this.failureTimes = [];
      this.openedAt = undefined;

      logger.info('Circuit breaker CLOSED', { name: this.name });
    }
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.openedAt) return false;
    const elapsed = Date.now() - this.openedAt.getTime();
    return elapsed >= this.timeout;
  }

  /**
   * Remove failures outside the window
   */
  private cleanupOldFailures(): void {
    const cutoff = Date.now() - this.windowSize;
    this.failureTimes = this.failureTimes.filter((time) => time > cutoff);
    this.failureCount = this.failureTimes.length;

    if (this.failureCount === 0) {
      this.consecutiveFailures = 0;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      openedAt: this.openedAt,
    };
  }

  /**
   * Manually reset the circuit
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.consecutiveFailures = 0;
    this.totalRequests = 0;
    this.failureTimes = [];
    this.openedAt = undefined;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;

    logger.info('Circuit breaker manually reset', { name: this.name });
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is ready for requests
   */
  isReady(): boolean {
    return this.state === 'closed' || this.state === 'half_open';
  }
}

/**
 * Registry to manage multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker
   */
  getOrCreate(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  getAll(): CircuitBreaker[] {
    return Array.from(this.breakers.values());
  }

  /**
   * Get metrics for all breakers
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics();
    }
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info('All circuit breakers reset');
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  /**
   * Clear all circuit breakers
   */
  clear(): void {
    this.breakers.clear();
  }
}

// Singleton registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
