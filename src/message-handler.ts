import { ZapFinanceDB } from "./db/database";
import { DBItem } from "./interfaces/interfaces";
import { Util } from "./util/util";

export class MessageHandler {
  regex = /^\$\$ .+/;
  util: Util;
  db: ZapFinanceDB;

  constructor(util: Util, db: ZapFinanceDB) { 
    this.util = util;
    this.db = db;
  }

  handle(message: string): string | void {
    const isValid = this.regex.test(message); // Validates if message starts with $$
    if (!isValid) return;

    const slugMessage = this.util.slug(message); // already removes $$ and trim
    if(slugMessage === 'help') return this.helpMessage();
    const res = this.registerExpense(slugMessage);

    return res;
  }

  helpMessage(){
    return `Para registrar uma despesa, envie uma mensagem no formato:\n$$ nome-da-despesa valor`;
  }

  registerExpense(message: string): string | void {
    const [name, valueStr] = message.split('-');

    const value = parseFloat(valueStr);
    if (isNaN(value)) return 'Valor informado inválido!';

    const dbItem = this.prepareExpenseDB(name, value);
    this.db.insertExpense(dbItem);
  }

  prepareExpenseDB(name: string, value: number): DBItem{
    const date = new Date().toISOString();
    const category = 'outros';

    return {name, category, value, date};
  }
}