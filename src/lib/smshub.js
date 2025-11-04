import axios from 'axios';
import { cfg } from '../config.js';
import { logger } from './logger.js';

async function smshubGet(params, tag = 'smshub') {
  const url = new URL(cfg.SMSHUB_API_URL);
  url.searchParams.set('api_key', cfg.SMSHUB_API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const t0 = Date.now();
  try {
    const { data } = await axios.get(url.toString(), { timeout: 15000 });
    logger.info(`${tag}.resp`, { action: params.action, ms: Date.now() - t0, data: String(data).slice(0, 120) });
    return String(data);
  } catch (err) {
    logger.error(`${tag}.error`, { action: params.action, ms: Date.now() - t0, error: err?.message });
    throw err;
  }
}

export async function getNumber({ service, country = 0, maxPriceUSD }) {
  const res = await smshubGet({ action: 'getNumber', service, country, maxPrice: maxPriceUSD }, 'smshub.getNumber');
  if (!res.startsWith('ACCESS_NUMBER')) throw new Error(`getNumber failed: ${res}`);
  const [, id, number] = res.split(':');
  return { activationId: Number(id), number };
}

export async function getStatus(activationId) {
  const res = await smshubGet({ action: 'getStatus', id: activationId }, 'smshub.getStatus');
  if (res.startsWith('STATUS_OK'))    return { state: 'OK', code: res.split(':')[1]?.trim() };
  if (res.startsWith('STATUS_WAIT'))  return { state: 'WAIT' };
  if (res.startsWith('STATUS_CANCEL'))return { state: 'CANCEL' };
  if (res.startsWith('STATUS_FINISH'))return { state: 'FINISH' };
  return { state: 'UNKNOWN', raw: res };
}

export async function setStatus(activationId, status) {
  const res = await smshubGet({ action: 'setStatus', id: activationId, status }, 'smshub.setStatus');
  if (!res.startsWith('ACCESS')) throw new Error(`setStatus failed: ${res}`);
  return res;
}
