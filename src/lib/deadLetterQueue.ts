import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

export interface DeadLetterMessage {
  id: string;
  originalTaskId: string;
  taskType: string;
  payload: Record<string, any>;
  error: string;
  errorStack?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date;
  createdAt: Date;
  status: 'pending' | 'retrying' | 'abandoned';
  metadata?: Record<string, any>;
}

/**
 * Dead-Letter Queue for handling failed async tasks with retry logic
 */
export class DeadLetterQueue {
  private messages: Map<string, DeadLetterMessage> = new Map();
  private retryIntervals: number[] = [60000, 300000, 900000, 3600000]; // 1m, 5m, 15m, 1h

  constructor(private prisma?: PrismaClient) {}

  /**
   * Send a failed task to the dead-letter queue
   */
  async enqueue(
    taskId: string,
    taskType: string,
    payload: Record<string, any>,
    error: Error,
    maxRetries: number = 3,
    metadata?: Record<string, any>
  ): Promise<DeadLetterMessage> {
    const dlqId = this.generateId();
    const nextRetryAt = this.calculateNextRetryTime(0);

    const message: DeadLetterMessage = {
      id: dlqId,
      originalTaskId: taskId,
      taskType,
      payload,
      error: error.message,
      errorStack: error.stack,
      retryCount: 0,
      maxRetries,
      nextRetryAt,
      createdAt: new Date(),
      status: 'pending',
      metadata,
    };

    // Store in memory
    this.messages.set(dlqId, message);

    // Persist to database if available
    if (this.prisma) {
      try {
        await (this.prisma as any).deadLetterTask.create({
          data: {
            id: dlqId,
            originalTaskId: taskId,
            taskType,
            payload: JSON.stringify(payload),
            error: error.message,
            errorStack: error.stack,
            retryCount: 0,
            maxRetries,
            nextRetryAt,
            status: 'pending',
            metadata: metadata ? JSON.stringify(metadata) : null,
          },
        });
      } catch (dbError) {
        logger.error('Failed to persist DLQ message to database', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
      }
    }

    logger.warn('Task sent to DLQ', {
      taskId,
      dlqId,
      taskType,
      error: error.message,
      maxRetries,
    });

    return message;
  }

  /**
   * Get a message from the DLQ
   */
  getMessage(dlqId: string): DeadLetterMessage | undefined {
    return this.messages.get(dlqId);
  }

  /**
   * Get all pending messages ready for retry
   */
  getPendingMessages(limit: number = 10): DeadLetterMessage[] {
    const now = new Date();
    return Array.from(this.messages.values())
      .filter((msg) => msg.status === 'pending' && msg.nextRetryAt <= now)
      .slice(0, limit);
  }

  /**
   * Mark message as retrying
   */
  async markRetrying(dlqId: string): Promise<void> {
    const msg = this.messages.get(dlqId);
    if (msg) {
      msg.status = 'retrying';

      if (this.prisma) {
        try {
          await (this.prisma as any).deadLetterTask.update({
            where: { id: dlqId },
            data: { status: 'retrying' },
          });
        } catch (error) {
          logger.error('Failed to update DLQ message status', {
            dlqId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  /**
   * Mark message as successfully processed (remove from DLQ)
   */
  async markSuccess(dlqId: string): Promise<void> {
    this.messages.delete(dlqId);

    if (this.prisma) {
      try {
        await (this.prisma as any).deadLetterTask.delete({
          where: { id: dlqId },
        });
      } catch (error) {
        logger.error('Failed to remove DLQ message after success', {
          dlqId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('DLQ message processed successfully', { dlqId });
  }

  /**
   * Retry a failed task
   */
  async retry(
    dlqId: string,
    handler: (taskType: string, payload: Record<string, any>) => Promise<void>
  ): Promise<{ success: boolean; error?: string }> {
    const msg = this.getMessage(dlqId);
    if (!msg) {
      return { success: false, error: 'Message not found in DLQ' };
    }

    try {
      await this.markRetrying(dlqId);
      await handler(msg.taskType, msg.payload);
      await this.markSuccess(dlqId);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      msg.retryCount++;

      if (msg.retryCount >= msg.maxRetries) {
        // Max retries exceeded, abandon the message
        msg.status = 'abandoned';

        if (this.prisma) {
          try {
            await (this.prisma as any).deadLetterTask.update({
              where: { id: dlqId },
              data: {
                status: 'abandoned',
                retryCount: msg.retryCount,
              },
            });
          } catch (dbError) {
            logger.error('Failed to mark message as abandoned', {
              dlqId,
              error: dbError instanceof Error ? dbError.message : String(dbError),
            });
          }
        }

        logger.error('Task abandoned after max retries', {
          dlqId,
          taskType: msg.taskType,
          retryCount: msg.retryCount,
          maxRetries: msg.maxRetries,
        });

        return { success: false, error: 'Max retries exceeded' };
      }

      // Schedule next retry
      msg.nextRetryAt = this.calculateNextRetryTime(msg.retryCount);
      msg.status = 'pending';

      if (this.prisma) {
        try {
          await (this.prisma as any).deadLetterTask.update({
            where: { id: dlqId },
            data: {
              retryCount: msg.retryCount,
              nextRetryAt: msg.nextRetryAt,
              status: 'pending',
            },
          });
        } catch (dbError) {
          logger.error('Failed to update DLQ message for retry', {
            dlqId,
            error: dbError instanceof Error ? dbError.message : String(dbError),
          });
        }
      }

      logger.warn('Task scheduled for retry', {
        dlqId,
        taskType: msg.taskType,
        retryCount: msg.retryCount,
        nextRetryAt: msg.nextRetryAt,
        error: errorMessage,
      });

      return { success: false, error: 'Scheduled for retry' };
    }
  }

  /**
   * Process all pending messages
   */
  async processPending(
    handler: (taskType: string, payload: Record<string, any>) => Promise<void>,
    limit: number = 10
  ): Promise<{ processed: number; failed: number; scheduled: number }> {
    const messages = this.getPendingMessages(limit);
    let processed = 0;
    let failed = 0;
    let scheduled = 0;

    for (const msg of messages) {
      const result = await this.retry(msg.id, handler);
      if (result.success) {
        processed++;
      } else if (result.error === 'Max retries exceeded') {
        failed++;
      } else {
        scheduled++;
      }
    }

    logger.info('DLQ batch processing complete', {
      processed,
      failed,
      scheduled,
      total: messages.length,
    });

    return { processed, failed, scheduled };
  }

  /**
   * Get statistics about the DLQ
   */
  getStats(): {
    total: number;
    pending: number;
    retrying: number;
    abandoned: number;
  } {
    const messages = Array.from(this.messages.values());
    return {
      total: messages.length,
      pending: messages.filter((m) => m.status === 'pending').length,
      retrying: messages.filter((m) => m.status === 'retrying').length,
      abandoned: messages.filter((m) => m.status === 'abandoned').length,
    };
  }

  /**
   * List all messages with optional filtering
   */
  listMessages(
    status?: 'pending' | 'retrying' | 'abandoned',
    taskType?: string
  ): DeadLetterMessage[] {
    let messages = Array.from(this.messages.values());

    if (status) {
      messages = messages.filter((m) => m.status === status);
    }

    if (taskType) {
      messages = messages.filter((m) => m.taskType === taskType);
    }

    return messages;
  }

  /**
   * Purge old abandoned messages (older than specified days)
   */
  async purgeAbandoned(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const messages = Array.from(this.messages.values()).filter(
      (m) => m.status === 'abandoned' && m.createdAt < cutoffDate
    );

    messages.forEach((m) => this.messages.delete(m.id));

    if (this.prisma) {
      try {
        await (this.prisma as any).deadLetterTask.deleteMany({
          where: {
            status: 'abandoned',
            createdAt: { lt: cutoffDate },
          },
        });
      } catch (error) {
        logger.error('Failed to purge abandoned messages from database', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Purged abandoned DLQ messages', {
      count: messages.length,
      olderThanDays,
    });

    return messages.length;
  }

  private calculateNextRetryTime(retryCount: number): Date {
    const interval = this.retryIntervals[Math.min(retryCount, this.retryIntervals.length - 1)];
    const nextRetry = new Date();
    nextRetry.setTime(nextRetry.getTime() + interval);
    return nextRetry;
  }

  private generateId(): string {
    return `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Clear all messages (useful for testing)
   */
  clear(): void {
    this.messages.clear();
  }
}

// Singleton instance
export let deadLetterQueue: DeadLetterQueue;

/**
 * Initialize DLQ with optional Prisma instance
 */
export function initializeDLQ(prisma?: PrismaClient): DeadLetterQueue {
  deadLetterQueue = new DeadLetterQueue(prisma);
  logger.info('Dead-Letter Queue initialized');
  return deadLetterQueue;
}

