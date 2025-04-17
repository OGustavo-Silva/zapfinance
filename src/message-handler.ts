import { ZapFinanceDB } from "./db/database";
import { IDBItem } from "./interfaces/interfaces";
import { Util } from "./util/util";

export class MessageHandler {
  regex = /^\$\$ .+/;
  util: Util;
  db: ZapFinanceDB;

  constructor(util: Util, db: ZapFinanceDB) {
    this.util = util;
    this.db = db;
  }

  handle(FullMessage: string): string | void {
    const isValid = this.regex.test(FullMessage); // Validates if message starts with $$
    if (!isValid) return;

    const message = FullMessage.replace('$$ ', '');

    // const slugMessage = this.util.slug(message); // already removes $$ and trim

    if (message === 'help') return this.helpMessage();

    const isCategory = message.startsWith('categoria');
    if (isCategory) this.setExpenseCategory(message);

    const res = this.registerExpense(message);

    return res;
  }

  /**
   * 
   * @returns {string} Help message with instructions on how to use the bot
   */
  helpMessage(): string {
    return `Para registrar uma despesa, envie uma mensagem no formato:\n$$ nomeDaDespesa valor
    Para definir a categoria de uma despesa: $$ categoria nome-da-despesa nome-da-categoria`;
  }

  setExpenseCategory(message: string) {
    console.log(message);
  }

  /**
   * Register to db an expense
   * @param {string} message Message sent to bot with name and value of expense
   * @returns String if message is invalid. Void if everything is ok
   */
  registerExpense(message: string): string | void {
    const regex = /^(.*?\s)(\d+)$/;

    const match = message.match(regex);
    if (!match) return 'Mensagem inválida!';

    const name = this.util.slug(match[1].trim());
    const value = parseFloat(match[2]);
    const category = match[3] ? match[3]: undefined;

    const dbItem = this.prepareExpenseDB(name, value, category);
    this.db.insertExpense(dbItem);
  }

  /**
   * 
   * @param name expense name
   * @param value expense value
   * @returns {IDBItem} Object to be handled on db
   */
  prepareExpenseDB(name: string, value: number, category: string = 'outros'): IDBItem {
    const date = new Date().toISOString();

    return { name, category, value, date };
  }
}