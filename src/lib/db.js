import mysql from 'mysql2/promise';
import { cfg } from '../config.js';
import { logger } from './logger.js';

export const pool = await mysql.createPool({
  host: cfg.DB_HOST, user: cfg.DB_USER, password: cfg.DB_PASS, database: cfg.DB_NAME,
  waitForConnections: true, connectionLimit: 10,
});
logger.info('db.ready', { host: cfg.DB_HOST, db: cfg.DB_NAME });
