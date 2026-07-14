import { Router, Request, Response } from 'express';
import { circuitBreakerRegistry } from '../lib/circuitBreaker.js';
import { metricsCollector } from '../lib/metrics.js';
import { logger } from '../lib/logger.js';
import * as promClient from 'prom-client';

const router = Router();

/**
 * Get all circuit breaker metrics
 */
router.get('/circuit-breakers', (_req: Request, res: Response) => {
  try {
    const metrics = circuitBreakerRegistry.getAllMetrics();
    res.json({
      status: 'ok',
      data: metrics,
    });
  } catch (error) {
    logger.error('Failed to get circuit breaker metrics', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get circuit breaker metrics',
    });
  }
});

/**
 * Reset all circuit breakers
 * NOTE: Must be before /circuit-breakers/:name to avoid wildcard matching "reset-all"
 */
router.post('/circuit-breakers/reset-all', (_req: Request, res: Response) => {
  try {
    circuitBreakerRegistry.resetAll();

    res.json({
      status: 'ok',
      message: 'All circuit breakers have been reset',
    });
  } catch (error) {
    logger.error('Failed to reset all circuit breakers', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to reset all circuit breakers',
    });
  }
});

/**
 * Get specific circuit breaker metrics
 */
router.get('/circuit-breakers/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const breaker = circuitBreakerRegistry.getOrCreate(name);

    if (!breaker) {
      return res.status(404).json({
        error: `Circuit breaker not found: ${name}`,
      });
    }

    res.json({
      status: 'ok',
      data: breaker.getMetrics(),
    });
  } catch (error) {
    logger.error('Failed to get circuit breaker metrics', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get circuit breaker metrics',
    });
  }
});

/**
 * Reset circuit breaker
 */
router.post('/circuit-breakers/:name/reset', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const breaker = circuitBreakerRegistry.getOrCreate(name);
    breaker.reset();

    res.json({
      status: 'ok',
      message: `Circuit breaker "${name}" has been reset`,
    });
  } catch (error) {
    logger.error('Failed to reset circuit breaker', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to reset circuit breaker',
    });
  }
});

/**
 * Get Prometheus metrics
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await metricsCollector.getMetrics();
    res.set('Content-Type', promClient.register.contentType);
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to get metrics', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get metrics',
    });
  }
});

/**
 * Get metrics summary
 */
router.get('/metrics/summary', (_req: Request, res: Response) => {
  try {
    // Get basic stats
    const stats = {
      circuitBreakers: circuitBreakerRegistry.getAllMetrics(),
      metricsTimestamp: new Date().toISOString(),
    };

    res.json({
      status: 'ok',
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get metrics summary', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get metrics summary',
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  try {
    const circuitBreakers = circuitBreakerRegistry.getAllMetrics();
    const unhealthyBreakers = Object.entries(circuitBreakers)
      .filter(([, metrics]) => metrics.state === 'open')
      .map(([name]) => name);

    const isHealthy = unhealthyBreakers.length === 0;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      circuitBreakers: {
        total: Object.keys(circuitBreakers).length,
        open: unhealthyBreakers.length,
        unhealthy: unhealthyBreakers,
      },
    });
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(503).json({
      status: 'error',
      error: 'Health check failed',
    });
  }
});

export default router;
