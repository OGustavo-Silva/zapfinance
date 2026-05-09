import 'dotenv/config';
import path from 'path';

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${key}`);
  }
  return value;
}

export const config = {
  timezone: required('TZ', 'America/Sao_Paulo'),
  dbPath: path.resolve(required('DB_PATH', './data/zapfinance.db')),
  authStatePath: path.resolve(required('AUTH_STATE_PATH', './auth_state')),
  schedulerTime: required('SCHEDULER_TIME', '09:00'),
  selfJid: process.env.SELF_JID,
} as const;
