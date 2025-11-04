import axios from 'axios';
import { cfg } from '../config.js';
import { logger } from './logger.js';

const API = `https://api.telegram.org/bot${cfg.BOT_TOKEN}`;

export async function sendMessage(chatId, text, extra = {}) {
  const t0 = Date.now();
  try {
    const { data } = await axios.post(`${API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: extra.parse_mode || undefined,
      reply_markup: extra.reply_markup || undefined,
      disable_web_page_preview: true,
    }, { timeout: 15000 });
    logger.debug('tg.sendMessage', { chatId, ms: Date.now() - t0 });
    return data;
  } catch (e) {
    logger.warn('tg.sendMessage.fail', { chatId, err: e.message });
    throw e;
  }
}
