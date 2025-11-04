import { cfg } from '../config.js';

export const fmtIDR = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export const usdToIdr = (usd) => Math.round(Number(usd) * cfg.USD_IDR);

export function menuText(name, saldo, isAdmin) {
  return `Halo ${name || ''}!\n` +
    `Saldo kamu: ${fmtIDR(saldo)}.\n\n` +
    `Perintah:\n` +
    `/saldo – cek saldo\n` +
    `/deposit <nominal> – ajukan deposit\n` +
    `/layanan – beli nomor OTP\n` +
    `/status <orderId> – cek status OTP\n` +
    `/cancel <orderId> – batalkan order\n\n` +
    (isAdmin ? `Admin:\n/addsaldo <tgId> <nominal>\n/approve_deposit <depositId>\n/setrate <service> <rate_usd>\n` : ``);
}


// robust ambil angka dari command (aman copy–paste)
export function getDigitsArgs(ctx, n = 1) {
  const raw = (ctx.message?.text || '').normalize('NFKC');
  const ent = ctx.message?.entities?.find(e => e.type === 'bot_command');
  const afterCmd = ent ? raw.slice(ent.offset + ent.length).trim() : raw.replace(/^\/\S+\s*/, '');
  const nums = (afterCmd.match(/\d+/g) || []).slice(0, n).map(s => Number(s));
  return nums;
}
