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

  let remaining;
  do {
    const next = await client.conversations.replies({
      channel: channel,
      ts: threadTs,
    });

    remaining = next.messages || [];

    if (remaining.length > 0) {
      logger.info(`Found ${remaining.length} remaining messages, deleting...`);
      await logThread(client, logger, {
        channel,
        threadTs,
        messages: remaining,
        deletedBy,
      });
      await rateLimiter.deleteBatch(client, logger, channel, remaining, 5, 2000);
    }
  } while (remaining.length > 0);

  logger.info(`destroy_thread completed`);
}
