import Database from 'better-sqlite3';
import crypto from 'crypto';

export type OutboundKind = 'REMINDER_D2' | 'REMINDER_D1' | 'ROLLOVER_NOTICE' | 'COMMAND_REPLY';

export function hashPayload(payload: string): string {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function wasAlreadySent(
  db: Database.Database,
  kind: OutboundKind,
  payloadHash: string
): boolean {
  const row = db.prepare<[string, string], { id: number }>(
    'SELECT id FROM outbound_messages_log WHERE kind = ? AND payload_hash = ?'
  ).get(kind, payloadHash);
  return row !== undefined;
}

export function logOutboundMessage(
  db: Database.Database,
  kind: OutboundKind,
  targetChatJid: string,
  payloadHash: string
): void {
  db.prepare(`
    INSERT OR IGNORE INTO outbound_messages_log (kind, target_chat_jid, payload_hash)
    VALUES (?, ?, ?)
  `).run(kind, targetChatJid, payloadHash);
}
