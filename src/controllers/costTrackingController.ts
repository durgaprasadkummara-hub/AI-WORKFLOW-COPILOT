import { Router, Request, Response } from 'express';
import { costTracker } from '../lib/costTracker.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * Get cost summary
 */
router.get('/summary', (_req: Request, res: Response) => {
  try {
    const summary = costTracker.getSummary();
    res.json({
      status: 'ok',
      data: {
        totalCost: parseFloat(summary.totalCost.toFixed(2)),
        totalRequests: summary.totalRequests,
        totalTokens: summary.totalTokens,
        byProvider: Object.entries(summary.byProvider).reduce(
          (acc, [provider, stat]) => ({
            ...acc,
            [provider]: {
              totalCost: parseFloat(stat.totalCost.toFixed(2)),
              totalRequests: stat.totalRequests,
              totalTokens: stat.totalTokens,
              costByModel: Object.entries(stat.costByModel).reduce(
                (m, [model, cost]) => ({
                  ...m,
                  [model]: parseFloat((cost as number).toFixed(4)),
                }),
                {}
              ),
            },
          }),
          {}
        ),
      },
    });
  } catch (error) {
    logger.error('Failed to get cost summary', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get cost summary',
    });
  }
});

/**
 * Get usage history
 * NOTE: Must be before /:provider to avoid wildcard matching "usage"
 */
router.get('/usage/history', (req: Request, res: Response) => {
  try {
    const { provider, limit, since } = req.query;
    const sinceDate = since ? new Date(since as string) : undefined;

    const history = costTracker.getUsageHistory(
      parseInt(limit as string) || 100,
      (provider as string) || undefined,
      sinceDate
    );

    res.json({
      status: 'ok',
      data: history.map((u) => ({
        ...u,
        inputCost: parseFloat(u.inputCost.toFixed(4)),
        outputCost: parseFloat(u.outputCost.toFixed(4)),
        totalCost: parseFloat(u.totalCost.toFixed(4)),
      })),
      total: history.length,
    });
  } catch (error) {
    logger.error('Failed to get cost history', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get cost history',
    });
  }
});

/**
 * Get cost trend
 * NOTE: Must be before /:provider to avoid wildcard matching "trend"
 */
router.get('/trend', (req: Request, res: Response) => {
  try {
    const { hours } = req.query;
    const trend = costTracker.getCostTrend(parseInt(hours as string) || 24);

    res.json({
      status: 'ok',
      data: trend.map((t) => ({
        timestamp: t.timestamp.toISOString(),
        cost: parseFloat(t.cost.toFixed(4)),
      })),
    });
  } catch (error) {
    logger.error('Failed to get cost trend', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get cost trend',
    });
  }
});

/**
 * Get pricing information
 * NOTE: Must be before /:provider to avoid wildcard matching "pricing"
 */
router.get('/pricing', (_req: Request, res: Response) => {
  try {
    const pricing = costTracker.getAllPricing();
    res.json({
      status: 'ok',
      data: pricing.map((p) => ({
        modelId: p.modelId,
        provider: p.provider,
        displayName: p.displayName,
        inputCostPer1k: p.inputCostPer1k,
        outputCostPer1k: p.outputCostPer1k,
      })),
      total: pricing.length,
    });
  } catch (error) {
    logger.error('Failed to get pricing', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get pricing',
    });
  }
});

/**
 * Get detailed cost report
 * NOTE: Must be before /:provider to avoid wildcard matching "report"
 */
router.get('/report', (_req: Request, res: Response) => {
  try {
    const report = costTracker.getDetailedReport();
    res.type('text/plain').send(report);
  } catch (error) {
    logger.error('Failed to generate cost report', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to generate cost report',
    });
  }
});

/**
 * Estimate cost for a request
 */
router.post('/estimate', (req: Request, res: Response) => {
  try {
    const { modelId, estimatedInputTokens, estimatedOutputTokens } = req.body;

    if (!modelId || !estimatedInputTokens || !estimatedOutputTokens) {
      return res.status(400).json({
        error: 'Missing required parameters: modelId, estimatedInputTokens, estimatedOutputTokens',
      });
    }

    const estimate = costTracker.estimateCost(
      modelId,
      estimatedInputTokens,
      estimatedOutputTokens
    );

    res.json({
      status: 'ok',
      data: {
        modelId,
        estimatedInputTokens,
        estimatedOutputTokens,
        estimated: estimate.estimated,
        estimatedCost: parseFloat(estimate.cost.toFixed(4)),
      },
    });
  } catch (error) {
    logger.error('Failed to estimate cost', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to estimate cost',
    });
  }
});

/**
 * Get per-provider cost summary
 * NOTE: Wildcard route — must be LAST to avoid swallowing literal paths above
 */
router.get('/:provider', (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const summary = costTracker.getProviderSummary(provider);

    if (!summary) {
      return res.status(404).json({
        error: `No cost data found for provider: ${provider}`,
      });
    }

    res.json({
      status: 'ok',
      data: {
        provider: summary.provider,
        totalCost: parseFloat(summary.totalCost.toFixed(2)),
        totalRequests: summary.totalRequests,
        totalTokens: summary.totalTokens,
        costByModel: Object.entries(summary.costByModel).reduce(
          (acc, [model, cost]) => ({
            ...acc,
            [model]: parseFloat((cost as number).toFixed(4)),
          }),
          {}
        ),
      },
    });
  } catch (error) {
    logger.error('Failed to get provider cost summary', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get provider cost summary',
    });
  }
});

export default router;
