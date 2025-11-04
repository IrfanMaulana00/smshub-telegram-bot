import { pool } from '../lib/db.js';
import { bot, withTask, UI, safeEdit } from './bot.js';
import { usdToIdr, fmtIDR, getDigitsArgs } from './ui.js';
import { getNumber, getStatus, setStatus } from '../lib/smshub.js';
import { logger } from '../lib/logger.js';

// layanan & rate (boleh ambil dari DB kalau mau)
const SERVICES = [
  { key: 'wa', label: 'WhatsApp' },
];
const RATE_OPTIONS_USD = [0.10, 0.20, 0.30, 0.50];

bot.command('layanan', (ctx) => withTask('cmd.layanan', ctx, async () => {
  const buttons = SERVICES.map(s => [UI.Markup.button.callback(s.label, `svc:${s.key}`)]);
  await ctx.reply('Pilih layanan:', UI.Markup.inlineKeyboard(buttons));
}));

bot.action(/svc:(.+)/, (ctx) => withTask('act.svc', ctx, async () => {
  const service = ctx.match[1];
  const countryButtons = [
    [UI.Markup.button.callback('Any/Global', `cty:${service}:0`)],
    [UI.Markup.button.callback('Indonesia', `cty:${service}:6`)]
  ];
  await ctx.editMessageText(`Layanan: ${service}\nPilih negara:`, UI.Markup.inlineKeyboard(countryButtons));
}));

bot.action(/cty:(.+):(\d+)/, (ctx) => withTask('act.country', ctx, async () => {
  await ctx.answerCbQuery().catch(()=>{});
  const service = ctx.match[1];
  const country = Number(ctx.match[2]);

  const rateButtons = RATE_OPTIONS_USD.map((r, i) => [
    UI.Markup.button.callback(
      `$${r.toFixed(2)} (~${fmtIDR(usdToIdr(r))})`,
      `rate:${service}:${country}:${i}`   // <-- kirim INDEX, bukan angka
    )
  ]);

  logger.info('rate.buttons.build', { service, country, rates: RATE_OPTIONS_USD });

  await safeEdit(
    ctx,
    `Layanan: ${service}\nNegara: ${country}\nPilih rate (max price):`,
    UI.Markup.inlineKeyboard(rateButtons)
  );
}));

bot.action(/rate:(.+):(\d+):(\d+)/, (ctx) => withTask('act.rate', ctx, async () => {
  await ctx.answerCbQuery().catch(()=>{});
  const service = ctx.match[1];
  const country = Number(ctx.match[2]);
  const idx = Number(ctx.match[3]);
  const rateUsd = RATE_OPTIONS_USD[idx];     // <-- ambil dari array
  if (rateUsd == null) return ctx.reply('Pilihan rate tidak valid.');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[user]] = await conn.query(`SELECT * FROM tg_users WHERE id=? FOR UPDATE`, [ctx.from.id]);
    if (!user) throw new Error('User tidak ditemukan');

    const priceIdr = usdToIdr(rateUsd);
    if (user.balance_idr < priceIdr) {
      await conn.rollback();
      conn.release();
      return ctx.reply(`Saldo tidak cukup. Harga: ${fmtIDR(priceIdr)}. Saldo kamu: ${fmtIDR(user.balance_idr)}.`);
    }

    const [ins] = await conn.query(
      `INSERT INTO orders (tg_user_id, service, country, rate_usd, price_idr, status)
       VALUES (?, ?, ?, ?, ?, 'created')`,
      [ctx.from.id, service, country, rateUsd, priceIdr]
    );
    const orderId = ins.insertId;
    await conn.query(`UPDATE tg_users SET balance_idr = balance_idr - ? WHERE id=?`, [priceIdr, ctx.from.id]);
    await conn.commit();

    logger.info('order.created', { order_id: orderId, user: ctx.from.id, service, country, rate_usd: rateUsd, price_idr: priceIdr });

    try {
      const { activationId, number } = await getNumber({ service, country, maxPriceUSD: rateUsd });
      await pool.query(
        `UPDATE orders SET smshub_activation_id=?, phone_number=?, status='number_allocated' WHERE id=?`,
        [activationId, number, orderId]
      );
      logger.info('order.number_allocated', { order_id: orderId, activation_id: activationId, phone: number });

      await ctx.reply(
        `Order #${orderId}\n` +
        `Layanan: ${service}\nNegara: ${country}\nRate: $${rateUsd.toFixed(2)} (~${fmtIDR(priceIdr)})\n` +
        `Nomor: ${number}\n\nGunakan /status ${orderId} untuk cek OTP atau tombol di bawah.`,
        UI.Markup.inlineKeyboard([
          [UI.Markup.button.callback('📩 Cek Status', `check:${orderId}`)],
          [UI.Markup.button.callback('❌ Cancel', `cancel:${orderId}`)]
        ])
      );
    } catch (e) {
      await pool.query(`UPDATE orders SET status='failed' WHERE id=?`, [orderId]);
      await pool.query(`UPDATE tg_users SET balance_idr = balance_idr + ? WHERE id=?`, [priceIdr, ctx.from.id]);
      logger.warn('order.allocate_failed', { order_id: orderId, error: e.message });
      await ctx.reply(`Gagal ambil nomor dari smshub: ${e.message}\nSaldo kamu direfund ${fmtIDR(priceIdr)}.`);
    }
  } catch (e) {
    await conn.rollback();
    await ctx.reply(`Gagal membuat order: ${e.message}`);
  } finally {
    conn.release();
  }
}));

async function doCheckStatus(ctx, orderId) {
  const [[order]] = await pool.query(
    `SELECT * FROM orders WHERE id=? AND tg_user_id=?`,
    [orderId, ctx.from.id]
  );
  if (!order) return ctx.reply('Order tidak ditemukan.');
  if (!order.smshub_activation_id) return ctx.reply(`Order #${orderId} belum dapat activation id. Status: ${order.status}`);

  const st = await getStatus(order.smshub_activation_id);
  logger.info('order.status', { order_id: orderId, state: st.state });
  if (st.state === 'OK') {
    await pool.query(`UPDATE orders SET otp_code=?, status='sms_received' WHERE id=?`, [st.code, orderId]);
    return ctx.reply(`Order #${orderId}\nOTP: *${st.code}*`, { parse_mode: 'Markdown' });
  } else if (st.state === 'WAIT') {
    return ctx.reply(`Order #${orderId}: menunggu SMS...`);
  } else if (st.state === 'FINISH') {
    await pool.query(`UPDATE orders SET status='finished' WHERE id=?`, [orderId]);
    return ctx.reply(`Order #${orderId}: selesai.`);
  } else if (st.state === 'CANCEL') {
    await pool.query(`UPDATE orders SET status='canceled' WHERE id=?`, [orderId]);
    return ctx.reply(`Order #${orderId}: dibatalkan di smshub.`);
  }
  return ctx.reply(`Order #${orderId}: status tidak dikenal.`);
}

bot.command('status', (ctx) => withTask('cmd.status', ctx, async () => {
  const [orderId] = getDigitsArgs(ctx, 1);
  if (!orderId) return ctx.reply('Format: /status <orderId>');
  await doCheckStatus(ctx, orderId);
}));
bot.action(/check:(\d+)/, (ctx) => withTask('act.check', ctx, async () => {
  await doCheckStatus(ctx, Number(ctx.match[1]));
}));

async function doCancel(ctx, orderId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[order]] = await conn.query(
      `SELECT * FROM orders WHERE id=? AND tg_user_id=? FOR UPDATE`,
      [orderId, ctx.from.id]
    );
    if (!order) throw new Error('Order tidak ditemukan');
    if (['canceled','finished','failed','sms_received'].includes(order.status)) {
      await conn.rollback();
      return ctx.reply(`Order #${orderId} status=${order.status} tidak bisa dibatalkan.`);
    }
    if (order.smshub_activation_id) await setStatus(order.smshub_activation_id, 8);
    await conn.query(`UPDATE orders SET status='canceled' WHERE id=?`, [orderId]);
    await conn.query(`UPDATE tg_users SET balance_idr = balance_idr + ? WHERE id=?`, [order.price_idr, order.tg_user_id]);
    await conn.commit();
    return ctx.reply(`Order #${orderId} dibatalkan. Refund ${fmtIDR(order.price_idr)} dikembalikan.`);
  } catch (e) {
    await conn.rollback();
    return ctx.reply(`Gagal cancel: ${e.message}`);
  } finally {
    conn.release();
  }
}
bot.command('cancel', (ctx) => withTask('cmd.cancel', ctx, async () => {
  const [orderId] = getDigitsArgs(ctx, 1);
  if (!orderId) return ctx.reply('Format: /cancel <orderId>');
  await doCancel(ctx, orderId);
}));
bot.action(/cancel:(\d+)/, (ctx) => withTask('act.cancel', ctx, async () => {
  await doCancel(ctx, Number(ctx.match[1]));
}));
