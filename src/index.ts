import * as dotenv from 'dotenv';
import { ZapFinance } from './main';
import {ZapFinanceDB} from './db/database';

function prepareConfig() {
  dotenv.config();
}

prepareConfig();
const db = new ZapFinanceDB();
new ZapFinance(db);

