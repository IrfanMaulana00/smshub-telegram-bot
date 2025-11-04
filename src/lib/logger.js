import { cfg } from '../config.js';
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = LEVELS[cfg.LOG_LEVEL] ?? 20;

function ts() { return new Date().toISOString(); }
function out(level, msg, meta = {}) {
  if ((LEVELS[level] ?? 99) < MIN) return;
  const line = { t: ts(), level, msg, ...meta };
  (level === 'error' ? console.error : console.log)(JSON.stringify(line));
}
export const logger = {
  debug: (m, x) => out('debug', m, x),
  info:  (m, x) => out('info',  m, x),
  warn:  (m, x) => out('warn',  m, x),
  error: (m, x) => out('error', m, x),
};
