import 'dotenv/config';

export const cfg = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  ADMIN_IDS: process.env.ADMIN_IDS || '',
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
  DB_NAME: process.env.DB_NAME,
  USD_IDR: Number(process.env.USD_IDR || '16500'),
  SMSHUB_API_KEY: process.env.SMSHUB_API_KEY,
  SMSHUB_API_URL: process.env.SMSHUB_API_URL || 'https://smshub.org/stubs/handler_api.php',
  DEFAULT_COUNTRY: Number(process.env.DEFAULT_COUNTRY || '0'),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Worker configs
  POLL_INTERVAL_MS: Number(process.env.POLL_INTERVAL_MS || '8000'),  // tiap 8 detik
  POLL_BATCH: Number(process.env.POLL_BATCH || '10'),                // max order/loop
  POLL_GRACE_MS: Number(process.env.POLL_GRACE_MS || '5000'),        // tunda 5s setelah allocate
};
if (!cfg.BOT_TOKEN) throw new Error('BOT_TOKEN required');
if (!cfg.SMSHUB_API_KEY) throw new Error('SMSHUB_API_KEY required');
