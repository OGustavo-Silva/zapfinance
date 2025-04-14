import { Client, LocalAuth } from 'whatsapp-web.js';
import { MessageHandler } from './message-handler';
import { Util } from './util/util'
import { ZapFinanceDB } from './db/database';
const qrcode = require('qrcode-terminal');

export class ZapFinance {
  private ownId = process.env['OWN_CHAT_ID'];
  util = new Util();

  constructor(db: ZapFinanceDB) {
    const client = new Client({
      authStrategy: new LocalAuth()
    });
    const messageHandler = new MessageHandler(this.util, db);

    // When the client is ready, run this code (only once)
    client.once('ready', () => {
      console.log('Client is ready!');
    });

    // When the client received QR-Code
    client.on('qr', (qr) => {
      qrcode.generate(qr, { small: true });
    });

    // Listening to all incoming messages
    client.on('message_create', message => {
      const { body } = message;

      const response = messageHandler.handle(body);
      this.util.sleep(75);
      if (response) client.sendMessage(this.ownId ?? message.from, response);
    });

    // Start your client
    console.log('Starting App...')
    client.initialize();
  }
}

