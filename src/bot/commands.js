import { pool } from '../lib/db.js';
import { bot, withTask } from './bot.js';
import { menuText, fmtIDR, getDigitsArgs } from './ui.js';
import { cfg } from '../config.js';
import { logger } from '../lib/logger.js';

const ADMIN_SET = new Set(
  (cfg.ADMIN_IDS || '')
    .split(/[,\s]+/)
    .map(s => s.replace(/\D/g, ''))
    .filter(Boolean)
    .map(n => Number(n))
);
const isAdmin = (uid) => ADMIN_SET.has(Number(uid));

async function ensureUser(ctx) {
  const u = ctx.from;
  await pool.query(
    `INSERT IGNORE INTO tg_users (id, username, first_name, last_name, is_admin)
     VALUES (?, ?, ?, ?, ?)`,
    [u.id, u.username || null, u.first_name || null, u.last_name || null, isAdmin(u.id) ? 1 : 0]
  );
}
async function getUser(uid) {
  const [rows] = await pool.query(`SELECT * FROM tg_users WHERE id=?`, [uid]);
  return rows[0] || null;
}

bot.command('whoami', (ctx) => ctx.reply(`Your Telegram ID: ${ctx.from.id}`));

bot.start((ctx) => withTask('cmd.start', ctx, async () => {
  await ensureUser(ctx);
  const u = await getUser(ctx.from.id);
  await ctx.reply(menuText(ctx.from.first_name, u.balance_idr, isAdmin(ctx.from.id)));
}));

bot.command('menu', (ctx) => withTask('cmd.saldo', ctx, async () => {
  await ensureUser(ctx);
  const u = await getUser(ctx.from.id);
  await ctx.reply(menuText(ctx.from.first_name, u.balance_idr, isAdmin(ctx.from.id)));
}));

bot.command('saldo', (ctx) => withTask('cmd.saldo', ctx, async () => {
  await ensureUser(ctx);
  const u = await getUser(ctx.from.id);
  await ctx.reply(`Saldo kamu: ${fmtIDR(u.balance_idr)}`);
}));

bot.command('deposit', (ctx) => withTask('cmd.deposit', ctx, async () => {
  await ensureUser(ctx);
  const [amount] = getDigitsArgs(ctx, 1);
  if (!amount || amount <= 0) return ctx.reply('Format: /deposit <nominal_idr>, contoh: /deposit 100000');
  const [r] = await pool.query(
    `INSERT INTO deposits (tg_user_id, amount_idr, status) VALUES (?, ?, 'pending')`,
    [ctx.from.id, Math.round(amount)]
  );
  logger.info('deposit.created', { id: r.insertId, amount_idr: amount, user: ctx.from.id });
  await ctx.reply(
    `Deposit dibuat (#${r.insertId}) sebesar ${fmtIDR(amount)}.\n` +
    `Setelah pembayaran masuk, admin akan approve.\n` +
    `Admin: /approve_deposit ${r.insertId}`
  );
}));

bot.command('approve_deposit', (ctx) => withTask('cmd.approve_deposit', ctx, async () => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('❌ Perintah ini khusus admin.');
  const [id] = getDigitsArgs(ctx, 1);
  if (!id) return ctx.reply('Format: /approve_deposit <depositId>');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[dep]] = await conn.query(`SELECT * FROM deposits WHERE id=? FOR UPDATE`, [id]);
    if (!dep) throw new Error('Deposit tidak ditemukan');
    if (dep.status !== 'pending') throw new Error(`Deposit status=${dep.status}`);

    await conn.query(`UPDATE deposits SET status='approved' WHERE id=?`, [id]);
    await conn.query(`UPDATE tg_users SET balance_idr = balance_idr + ? WHERE id=?`, [dep.amount_idr, dep.tg_user_id]);
    await conn.commit();
    logger.info('deposit.approved', { id, amount_idr: dep.amount_idr, user: dep.tg_user_id, by: ctx.from.id });
    await ctx.reply(`Deposit #${id} approved. Kredit ${fmtIDR(dep.amount_idr)} ke user ${dep.tg_user_id}.`);
  } catch (e) {
    await conn.rollback();
    await ctx.reply(`Gagal approve: ${e.message}`);
  } finally {
    conn.release();
  }
}));

bot.command('addsaldo', (ctx) => withTask('cmd.addsaldo', ctx, async () => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('❌ Perintah ini khusus admin.');
  const [tgId, amt] = getDigitsArgs(ctx, 2);
  if (!tgId || !amt) return ctx.reply('Format: /addsaldo <tgId> <nominal_idr>');
  await pool.query(`UPDATE tg_users SET balance_idr=balance_idr+? WHERE id=?`, [Math.round(amt), tgId]);
  logger.info('balance.credit', { target: tgId, amount_idr: amt, by: ctx.from.id });
  await ctx.reply(`OK. Tambah saldo ${fmtIDR(amt)} ke ${tgId}.`);
}));

bot.command('setrate', (ctx) => withTask('cmd.setrate', ctx, async () => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('❌ Perintah ini khusus admin.');
  const raw = (ctx.message?.text || '').normalize('NFKC').split(/\s+/);
  const service = raw[1]?.toLowerCase();
  const rate = Number(raw[2] || '0');
  if (!service || !rate) return ctx.reply('Format: /setrate <service> <rate_usd>');

  await pool.query(
    `INSERT INTO service_rates (service, default_rate_usd)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE default_rate_usd=VALUES(default_rate_usd)`,
    [service, rate]
  );
  await ctx.reply(`Rate default ${service} di-set ke $${rate.toFixed(2)}.`);
}));


export { isAdmin, ensureUser, getUser };
