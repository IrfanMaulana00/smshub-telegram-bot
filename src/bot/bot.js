import { Telegraf, Markup } from 'telegraf';
import { cfg } from '../config.js';
import { logger } from '../lib/logger.js';

export const bot = new Telegraf(cfg.BOT_TOKEN);
logger.info('bot.init', { mode: 'long-polling' });

// log ringkas tiap update
bot.use((ctx, next) => {
  logger.debug('update', {
    update_id: ctx.update?.update_id,
    type: ctx.updateType,
    user_id: ctx.from?.id,
    text: (ctx.message?.text || ctx.callbackQuery?.data || '').slice(0, 80)
  });
  return next();
});

bot.catch((err, ctx) => {
  logger.error('bot.unhandled', { update_id: ctx.update?.update_id, error: err?.message });
});

export async function withTask(name, ctx, fn) {
  const t0 = Date.now();
  try {
    const res = await fn();
    ctx.state ??= {};
    ctx.state.handled = true;     // <— tandai update sudah ditangani
    logger.info('task', { name, ms: Date.now() - t0, user: ctx.from?.id });
    return res;
  } catch (e) {
    logger.error('task.error', { name, ms: Date.now() - t0, user: ctx.from?.id, err: e.message });
    throw e;
  }
}

// helper editMessageText yang abaikan “message is not modified”
export async function safeEdit(ctx, text, keyboard) {
  try {
    await ctx.editMessageText(text, keyboard);
  } catch (e) {
    if (!/message is not modified/i.test(String(e.message))) throw e;
  }
}


export const UI = { Markup };
