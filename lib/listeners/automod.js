import { WebClient } from '@slack/web-api';
import { logAutomod } from '../logger.js';

const bot = new WebClient(process.env.SLACK_BOT_TOKEN);
const words = (process.env.AUTOMOD_WORDS || '')
  .split(',')
  .map(w => w.trim().toLowerCase())
  .filter(Boolean);

function fuz(text, word) {
  const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  const tokens = normalized.split(/\s+/);
  return tokens.some(t => t.includes(word));
}

export default async function automodListener({ event, logger }) {
  if (!words.length) return;
  if (!event || event.type !== 'message' || !event.user) return;
  if (event.subtype) return;
  if (!event.text) return;

  for (const word of words) {
    if (fuz(event.text, word)) {
      await Promise.all([
        bot.chat.postMessage({
          channel: event.user,
          text: `"${word}" has been banned by automod. Your infraction has been logged.`,
        }).catch(e => {
          logger.warn(`automod dm failed: ${e.message}`);
        }),
        logAutomod(bot, { channel: event.channel, user: event.user, word, text: event.text }).catch(e => {
          logger.warn(`automod log failed: ${e.message}`);
        }),
      ]);
      return; // one match is enough
    }
  }
}
