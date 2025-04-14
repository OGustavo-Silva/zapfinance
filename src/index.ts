import * as dotenv from 'dotenv';
import { ZapFinance } from './main';
import {ZapFinanceDB} from './db/database';

async function prepareConfig() {
  await dotenv.config();
}

prepareConfig();
new ZapFinanceDB();
// new ZapFinance();

