import 'dotenv/config';
import { connectToWhatsApp } from '../whatsapp-adapter/whatsapp.adapter';
import { getDb } from '../repository-sqlite/database';

async function main(): Promise<void> {
  console.log('🚀 ZapFinance iniciando...');

  // Inicializar banco de dados e schema
  getDb();
  console.log('[db] Banco de dados pronto.');

  // Conectar ao WhatsApp
  await connectToWhatsApp();
}

main().catch((err) => {
  console.error('Erro fatal na inicialização:', err);
  process.exit(1);
});
