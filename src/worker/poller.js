import { pool } from '../lib/db.js';
import { cfg } from '../config.js';
import { logger } from '../lib/logger.js';
import { getStatus } from '../lib/smshub.js';
import { sendMessage } from '../lib/telegram.js';

export function startPoller() {
  logger.info('poller.start', { every_ms: cfg.POLL_INTERVAL_MS, batch: cfg.POLL_BATCH });
  setInterval(loop, cfg.POLL_INTERVAL_MS);
}

async function loop() {
  const conn = await pool.getConnection();
  try {
    // Klaim batch order yg siap dicek, hindari yang baru saja dibuat (grace)
    const [rows] = await conn.query(
      `SELECT id, tg_user_id, smshub_activation_id, price_idr
         FROM orders
        WHERE status='number_allocated'
          AND updated_at IS NOT NULL
          AND updated_at < (NOW(6) - INTERVAL ? MICROSECOND)
        ORDER BY id ASC
        LIMIT ?`,
      [cfg.POLL_GRACE_MS * 1000, cfg.POLL_BATCH] // INTERVAL pakai microsecond
    );
    if (!rows.length) return;

    for (const o of rows) {
      await processOne(o);
    }
  } catch (e) {
    logger.error('poller.loop_error', { err: e.message });
  } finally {
    conn.release();
  }
}

async function processOne(order) {
  const { id: orderId, tg_user_id, smshub_activation_id } = order;
  const t0 = Date.now();
  try {
    const st = await getStatus(smshub_activation_id);
    if (st.state === 'OK') {
      await pool.query(`UPDATE orders SET otp_code=?, status='sms_received' WHERE id=?`, [st.code, orderId]);
      await sendMessage(tg_user_id, `Order #${orderId}\nOTP: *${st.code}*`, { parse_mode: 'Markdown' });
      logger.info('poller.ok', { order_id: orderId, ms: Date.now() - t0 });
    } else if (st.state === 'FINISH') {
      await pool.query(`UPDATE orders SET status='finished' WHERE id=?`, [orderId]);
      await sendMessage(tg_user_id, `Order #${orderId}: selesai.`);
      logger.info('poller.finish', { order_id: orderId });
    } else if (st.state === 'CANCEL') {
      await pool.query(`UPDATE orders SET status='canceled' WHERE id=?`, [orderId]);
      await sendMessage(tg_user_id, `Order #${orderId}: dibatalkan di smshub.`);
      logger.info('poller.cancel', { order_id: orderId });
    } else {
      logger.debug('poller.wait', { order_id: orderId, state: st.state });
    }
  } catch (e) {
    logger.warn('poller.proc_error', { order_id: orderId, err: e.message });
  }
}
