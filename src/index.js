import { bot } from './bot/bot.js';
import './bot/commands.js';
import './bot/actions.js';
import { logger } from './lib/logger.js';
import { startPoller } from './worker/poller.js';

await bot.launch();
logger.info('bot.running', { polling: true });

await bot.telegram.setMyCommands([
  { command: 'menu', description: 'Tampilkan menu' },
  { command: 'saldo', description: 'Cek saldo' },
  { command: 'deposit', description: 'Ajukan deposit: /deposit <nominal>' },
  { command: 'layanan', description: 'Beli nomor OTP' },
  { command: 'status', description: 'Cek status OTP: /status <orderId>' },
  { command: 'cancel', description: 'Batalkan order: /cancel <orderId>' },
  // Command admin (opsional tampil ke semua user)
  { command: 'addsaldo', description: 'Admin: tambah saldo' },
  { command: 'approve_deposit', description: 'Admin: approve deposit' },
  { command: 'setrate', description: 'Admin: set rate USD' },
]);

// Fallback global — hanya kirim jika belum “handled” oleh handler lain
bot.use(async (ctx, next) => {
  await next();
  if (ctx.state?.handled) return;
  if (ctx.updateType !== 'message') return;
  // tampilkan menu default
  const [[u]] = await pool.query(`SELECT balance_idr FROM tg_users WHERE id=?`, [ctx.from.id]);
  const saldo = u?.balance_idr ?? 0;
  const isAdmin = false; // kalau mau, ambil dari tg_users.is_admin
  await ctx.reply(menuText(ctx.from.first_name, saldo, isAdmin));
});

startPoller();

// graceful stop
process.once('SIGINT', () => { logger.warn('bot.stop', { sig: 'SIGINT' }); bot.stop('SIGINT'); });
process.once('SIGTERM', () => { logger.warn('bot.stop', { sig: 'SIGTERM' }); bot.stop('SIGTERM'); });
