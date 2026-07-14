import { Router, Request, Response } from 'express';
import { deadLetterQueue } from '../lib/deadLetterQueue.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * Get DLQ statistics
 */
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = deadLetterQueue.getStats();
    res.json({
      status: 'ok',
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get DLQ stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get DLQ statistics',
    });
  }
});

/**
 * List dead-letter messages
 */
router.get('/messages', (req: Request, res: Response) => {
  try {
    const { status, taskType, limit } = req.query;
    const messages = deadLetterQueue.listMessages(
      (status as any) || undefined,
      (taskType as any) || undefined
    );

    res.json({
      status: 'ok',
      data: messages.slice(0, parseInt(limit as string) || 50),
      total: messages.length,
    });
  } catch (error) {
    logger.error('Failed to list DLQ messages', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to list DLQ messages',
    });
  }
});

/**
 * Get specific dead-letter message
 */
router.get('/messages/:dlqId', (req: Request, res: Response) => {
  try {
    const { dlqId } = req.params;
    const message = deadLetterQueue.getMessage(dlqId);

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
      });
    }

    res.json({
      status: 'ok',
      data: message,
    });
  } catch (error) {
    logger.error('Failed to get DLQ message', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to get DLQ message',
    });
  }
});

/**
 * Retry a dead-letter message
 */
router.post('/messages/:dlqId/retry', async (req: Request, res: Response) => {
  try {
    const { dlqId } = req.params;
    const message = deadLetterQueue.getMessage(dlqId);

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
      });
    }

    // Mock handler - in production, would call actual task processing logic
    const handler = async (taskType: string, payload: Record<string, any>) => {
      logger.info('Retrying DLQ message', { dlqId, taskType });
      // Simulate some processing
      await new Promise((resolve) => setTimeout(resolve, 100));
    };

    const result = await deadLetterQueue.retry(dlqId, handler);

    res.json({
      status: 'ok',
      result,
    });
  } catch (error) {
    logger.error('Failed to retry DLQ message', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to retry DLQ message',
    });
  }
});

/**
 * Purge abandoned messages
 */
router.post('/purge', async (req: Request, res: Response) => {
  try {
    const { olderThanDays } = req.body;
    const count = await deadLetterQueue.purgeAbandoned(olderThanDays || 30);

    res.json({
      status: 'ok',
      purged: count,
    });
  } catch (error) {
    logger.error('Failed to purge DLQ', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Failed to purge DLQ',
    });
  }
});

export default router;
