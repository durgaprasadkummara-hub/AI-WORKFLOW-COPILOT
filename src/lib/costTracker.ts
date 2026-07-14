import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

export interface ProviderPricing {
  modelId: string;
  provider: 'openai' | 'claude' | 'other';
  inputCostPer1k: number;
  outputCostPer1k: number;
  displayName: string;
}

export interface CostUsage {
  provider: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  timestamp: Date;
}

export interface ProviderCostSummary {
  provider: string;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  costByModel: Record<string, number>;
}

/**
 * Cost tracking for AI API usage
 */
const MAX_HISTORY_SIZE = 10000;

export class CostTracker {
  private pricingMap: Map<string, ProviderPricing> = new Map();
  private usageHistory: CostUsage[] = [];
  private aggregatedUsage: Map<string, ProviderCostSummary> = new Map();

  constructor(private prisma?: PrismaClient) {
    this.initializePricing();
  }

  /**
   * Initialize default pricing
   */
  private initializePricing(): void {
    // OpenAI pricing (as of Jan 2024)
    this.pricingMap.set('gpt-4-turbo', {
      modelId: 'gpt-4-turbo',
      provider: 'openai',
      displayName: 'GPT-4 Turbo',
      inputCostPer1k: 0.01,
      outputCostPer1k: 0.03,
    });

    this.pricingMap.set('gpt-4', {
      modelId: 'gpt-4',
      provider: 'openai',
      displayName: 'GPT-4',
      inputCostPer1k: 0.03,
      outputCostPer1k: 0.06,
    });

    this.pricingMap.set('gpt-3.5-turbo', {
      modelId: 'gpt-3.5-turbo',
      provider: 'openai',
      displayName: 'GPT-3.5 Turbo',
      inputCostPer1k: 0.0005,
      outputCostPer1k: 0.0015,
    });

    // Claude pricing (as of Jan 2024)
    this.pricingMap.set('claude-3-opus', {
      modelId: 'claude-3-opus',
      provider: 'claude',
      displayName: 'Claude 3 Opus',
      inputCostPer1k: 0.015,
      outputCostPer1k: 0.075,
    });

    this.pricingMap.set('claude-3-sonnet', {
      modelId: 'claude-3-sonnet',
      provider: 'claude',
      displayName: 'Claude 3 Sonnet',
      inputCostPer1k: 0.003,
      outputCostPer1k: 0.015,
    });

    this.pricingMap.set('claude-3-5-sonnet-20241022', {
      modelId: 'claude-3-5-sonnet-20241022',
      provider: 'claude',
      displayName: 'Claude 3.5 Sonnet',
      inputCostPer1k: 0.003,
      outputCostPer1k: 0.015,
    });

    this.pricingMap.set('claude-3-haiku', {
      modelId: 'claude-3-haiku',
      provider: 'claude',
      displayName: 'Claude 3 Haiku',
      inputCostPer1k: 0.00025,
      outputCostPer1k: 0.00125,
    });

    logger.info('Cost tracker pricing initialized', {
      models: this.pricingMap.size,
    });
  }

  /**
   * Record API usage
   */
  recordUsage(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): CostUsage {
    const pricing = this.pricingMap.get(modelId);
    if (!pricing) {
      logger.warn('Unknown model ID for cost tracking', { modelId });
    }

    const inputCost = (inputTokens / 1000) * (pricing?.inputCostPer1k || 0);
    const outputCost = (outputTokens / 1000) * (pricing?.outputCostPer1k || 0);

    const usage: CostUsage = {
      provider: pricing?.provider || 'unknown',
      modelId,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      timestamp: new Date(),
    };

    // Add to history (capped to prevent unbounded memory growth)
    this.usageHistory.push(usage);
    if (this.usageHistory.length > MAX_HISTORY_SIZE) {
      this.usageHistory = this.usageHistory.slice(-MAX_HISTORY_SIZE);
    }

    // Update aggregated stats
    this.updateAggregatedUsage(usage);

    // Persist to database if available
    if (this.prisma) {
      this.persistCostUsage(usage).catch((error) => {
        logger.error('Failed to persist cost usage', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    logger.debug('API usage recorded', {
      modelId,
      inputTokens,
      outputTokens,
      cost: `$${usage.totalCost.toFixed(4)}`,
    });

    return usage;
  }

  /**
   * Update aggregated usage statistics
   */
  private updateAggregatedUsage(usage: CostUsage): void {
    const key = usage.provider;
    const summary = this.aggregatedUsage.get(key) || {
      provider: usage.provider,
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      costByModel: {},
    };

    summary.totalRequests++;
    summary.totalInputTokens += usage.inputTokens;
    summary.totalOutputTokens += usage.outputTokens;
    summary.totalTokens += usage.totalTokens;
    summary.totalCost += usage.totalCost;

    if (!summary.costByModel[usage.modelId]) {
      summary.costByModel[usage.modelId] = 0;
    }
    summary.costByModel[usage.modelId] += usage.totalCost;

    this.aggregatedUsage.set(key, summary);
  }

  /**
   * Get total cost summary
   */
  getSummary(): {
    totalCost: number;
    totalRequests: number;
    totalTokens: number;
    byProvider: Record<string, ProviderCostSummary>;
  } {
    let totalCost = 0;
    let totalRequests = 0;
    let totalTokens = 0;
    const byProvider: Record<string, ProviderCostSummary> = {};

    for (const [key, summary] of this.aggregatedUsage) {
      totalCost += summary.totalCost;
      totalRequests += summary.totalRequests;
      totalTokens += summary.totalTokens;
      byProvider[key] = summary;
    }

    return { totalCost, totalRequests, totalTokens, byProvider };
  }

  /**
   * Get per-provider summary
   */
  getProviderSummary(provider: string): ProviderCostSummary | undefined {
    return this.aggregatedUsage.get(provider);
  }

  /**
   * Get usage history with optional filtering
   */
  getUsageHistory(
    limit: number = 100,
    provider?: string,
    since?: Date
  ): CostUsage[] {
    let history = [...this.usageHistory];

    if (provider) {
      history = history.filter((u) => u.provider === provider);
    }

    if (since) {
      history = history.filter((u) => u.timestamp >= since);
    }

    return history.slice(-limit).reverse();
  }

  /**
   * Get pricing for a model
   */
  getPricing(modelId: string): ProviderPricing | undefined {
    return this.pricingMap.get(modelId);
  }

  /**
   * Update pricing for a model
   */
  setPricing(pricing: ProviderPricing): void {
    this.pricingMap.set(pricing.modelId, pricing);
    logger.info('Pricing updated', {
      modelId: pricing.modelId,
      provider: pricing.provider,
    });
  }

  /**
   * Get all available pricing models
   */
  getAllPricing(): ProviderPricing[] {
    return Array.from(this.pricingMap.values());
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(
    modelId: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number
  ): { estimated: boolean; cost: number } {
    const pricing = this.pricingMap.get(modelId);
    if (!pricing) {
      return { estimated: false, cost: 0 };
    }

    const inputCost = (estimatedInputTokens / 1000) * pricing.inputCostPer1k;
    const outputCost = (estimatedOutputTokens / 1000) * pricing.outputCostPer1k;

    return {
      estimated: true,
      cost: inputCost + outputCost,
    };
  }

  /**
   * Get cost trend over time
   */
  getCostTrend(hours: number = 24): { timestamp: Date; cost: number }[] {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);

    const trend: { timestamp: Date; cost: number }[] = [];
    let currentCost = 0;
    let currentHour = Math.floor(Date.now() / 3600000) * 3600000;

    for (const usage of this.usageHistory) {
      if (usage.timestamp < cutoff) continue;

      const usageHour = Math.floor(usage.timestamp.getTime() / 3600000) * 3600000;

      if (usageHour > currentHour) {
        trend.push({ timestamp: new Date(currentHour), cost: currentCost });
        currentHour = usageHour;
        currentCost = 0;
      }

      currentCost += usage.totalCost;
    }

    if (currentCost > 0) {
      trend.push({ timestamp: new Date(currentHour), cost: currentCost });
    }

    return trend;
  }

  /**
   * Persist cost usage to database
   */
  private async persistCostUsage(usage: CostUsage): Promise<void> {
    if (!this.prisma) return;

    try {
      await (this.prisma as any).costUsage.create({
        data: {
          provider: usage.provider,
          modelId: usage.modelId,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          inputCost: usage.inputCost,
          outputCost: usage.outputCost,
          totalCost: usage.totalCost,
        },
      });
    } catch (error) {
      logger.error('Failed to persist cost usage to database', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.usageHistory = [];
    this.aggregatedUsage.clear();
    logger.info('Cost tracker reset');
  }

  /**
   * Get detailed report
   */
  getDetailedReport(): string {
    const summary = this.getSummary();
    const lines = [
      '=== AI API Cost Report ===',
      `Total Cost: $${summary.totalCost.toFixed(2)}`,
      `Total Requests: ${summary.totalRequests}`,
      `Total Tokens: ${summary.totalTokens}`,
      '',
      'By Provider:',
    ];

    for (const [provider, stat] of Object.entries(summary.byProvider)) {
      lines.push(`  ${provider}:`);
      lines.push(`    Cost: $${stat.totalCost.toFixed(2)}`);
      lines.push(`    Requests: ${stat.totalRequests}`);
      lines.push(`    Tokens: ${stat.totalTokens}`);

      if (Object.keys(stat.costByModel).length > 0) {
        lines.push('    By Model:');
        for (const [model, cost] of Object.entries(stat.costByModel)) {
          lines.push(`      ${model}: $${(cost as number).toFixed(4)}`);
        }
      }
    }

    return lines.join('\n');
  }
}

// Singleton instance
export let costTracker: CostTracker;

/**
 * Initialize cost tracker with optional Prisma instance
 */
export function initializeCostTracker(prisma?: PrismaClient): CostTracker {
  costTracker = new CostTracker(prisma);
  return costTracker;
}
