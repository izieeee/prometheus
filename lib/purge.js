import { RateLimiter } from './ratelimiter.js';
import { logThread } from './logger.js';

const rateLimiter = new RateLimiter(1000, 5);

export async function purge(client, logger, channel, threadTs, deletedBy) {
  const result = await client.conversations.replies({
    channel: channel,
    ts: threadTs,
  });

  let messages = result.messages || [];
  
  logger.info(`Found ${messages.length} messages to delete`);

  await logThread(client, logger, {
    channel,
    threadTs,
    messages,
    deletedBy,
  });

  await rateLimiter.deleteBatch(client, logger, channel, messages, 5, 2000);

  const next = await client.conversations.replies({
    channel: channel,
    ts: threadTs,
  });

  const remaining = next.messages || [];
  
  if (remaining.length > 0) {
    logger.info(`Found ${remaining.length} remaining messages, deleting...`);
    await rateLimiter.deleteBatch(client, logger, channel, remaining, 5, 2000);
  }

  logger.info(`destroy_thread completed`);
}
