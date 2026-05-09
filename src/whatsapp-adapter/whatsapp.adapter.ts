import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import { config } from '../app-bootstrap/config';
import { CommandRouter } from '../command-router/command-router';
import { SchedulerService } from '../scheduler-service/scheduler.service';
import { getDb } from '../repository-sqlite/database';
import cron from 'node-cron';

let sock: WASocket | null = null;
let selfJid: string | null = null;

async function connectToWhatsApp(): Promise<void> {
  if (!fs.existsSync(config.authStatePath)) {
    fs.mkdirSync(config.authStatePath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(config.authStatePath);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, console as any),
    },
    printQRInTerminal: false,
    browser: ['ZapFinance', 'Desktop', '1.0.0'],
  });

  const db = getDb();
  const router = new CommandRouter(db);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Escaneie o QR code abaixo com o WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      selfJid = sock!.user?.id ?? null;
      console.log(`[whatsapp] Conectado como ${selfJid}`);

      // Inicializar scheduler após conexão
      startScheduler(db, selfJid!);
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[whatsapp] Conexão fechada (${statusCode}). Reconectar: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 5000);
      } else {
        console.log('[whatsapp] Sessão encerrada (logout). Delete a pasta auth_state para reconectar.');
        process.exit(0);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe === false) continue;

      // Filtro de self-chat: aceitar somente mensagens do próprio número
      const chatJid = msg.key.remoteJidAlt ?? '';
      if (!selfJid || !chatJid.startsWith(selfJid.split(':')[0])) continue;

      const text =
        msg.message.conversation ??
        msg.message.extendedTextMessage?.text ??
        '';

      if (!text.startsWith('$$')) continue;

      const messageId = msg.key.id ?? '';
      console.log(`[whatsapp] Comando recebido: ${text.slice(0, 80)}`);

      const reply = router.handle(text, messageId);
      if (reply) {
        await sock!.sendMessage(chatJid, { text: reply });
      }
    }
  });
}

function startScheduler(db: ReturnType<typeof getDb>, jid: string): void {
  const [hh, mm] = config.schedulerTime.split(':');
  const cronExpr = `${mm} ${hh} * * *`;

  const scheduler = new SchedulerService(db, async (text) => {
    if (sock && jid) {
      await sock.sendMessage(jid, { text });
    }
  }, jid);

  cron.schedule(cronExpr, () => {
    scheduler.runDailyJob().catch(e => console.error('[scheduler] Erro no job diário:', e));
  }, { timezone: config.timezone });

  console.log(`[scheduler] Job diário agendado para ${config.schedulerTime} (${config.timezone})`);
}

export { connectToWhatsApp };
