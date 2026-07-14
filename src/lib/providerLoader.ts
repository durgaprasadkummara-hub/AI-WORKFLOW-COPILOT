import { AiProvider } from "./provider.js";
import { OpenAiProvider } from "./openaiProvider.js";
import { ClaudeProvider } from "./claudeProvider.js";
import { MockAiProvider } from "./mockAiProvider.js";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

export interface ProviderConfig {
  type: 'openai' | 'claude' | 'mock';
  apiKey?: string;
  modelId?: string;
  fallbackToMock?: boolean;
}

export function createAiProvider(providerConfig?: ProviderConfig): AiProvider {
  const provider = providerConfig?.type || config.aiProvider.toLowerCase();
  const fallbackToMock = providerConfig?.fallbackToMock !== false;

  switch (provider) {
    case 'mock':
      logger.info('Loaded AI provider', { provider: 'mock' });
      return new MockAiProvider();

    case 'claude':
      try {
        logger.info('Loaded AI provider', {
          provider: 'claude',
          model: providerConfig?.modelId || process.env.AI_MODEL_ID || 'claude-3-5-sonnet-20241022',
        });
        return new ClaudeProvider(
          providerConfig?.apiKey,
          providerConfig?.modelId || process.env.AI_MODEL_ID || 'claude-3-5-sonnet-20241022'
        );
      } catch (error) {
        logger.warn('Claude provider unavailable', {
          error: error instanceof Error ? error.message : String(error),
          fallbackToMock,
        });
        if (fallbackToMock) {
          return new MockAiProvider();
        }
        throw error;
      }

    case 'openai':
    default:
      try {
        logger.info('Loaded AI provider', {
          provider: 'openai',
          model: providerConfig?.modelId || process.env.AI_MODEL_ID || 'gpt-4',
        });
        return new OpenAiProvider(
          providerConfig?.apiKey,
          providerConfig?.modelId || process.env.AI_MODEL_ID || 'gpt-4'
        );
      } catch (error) {
        logger.warn('OpenAI provider unavailable', {
          error: error instanceof Error ? error.message : String(error),
          fallbackToMock,
        });
        if (fallbackToMock) {
          return new MockAiProvider();
        }
        throw error;
      }
  }
}

/**
 * Get current provider configuration from environment
 */
export function getProviderConfig(): ProviderConfig {
  return {
    type: (config.aiProvider.toLowerCase() as any) || 'openai',
    apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
    modelId: process.env.AI_MODEL_ID,
    fallbackToMock: process.env.FALLBACK_TO_MOCK !== 'false',
  };
}
