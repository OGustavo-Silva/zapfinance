import { ZapFinanceDB } from "./db/database";
import { IDBItem } from "./interfaces/interfaces";
import { Util } from "./util/util";

export class MessageHandler {
  regex = /^\$\$ .+/;
  registerExpenseRegex = /^(.*?)(\d+)(?:\s+(.*?))?$/;

  util: Util;
  db: ZapFinanceDB;

  constructor(util: Util, db: ZapFinanceDB) {
    this.util = util;
    this.db = db;
  }

  async handle(FullMessage: string): Promise<string | void> {
    const isValid = this.regex.test(FullMessage); // Validates if message starts with $$
    if (!isValid) return;

    const message = FullMessage.replace('$$ ', '');

    // const slugMessage = this.util.slug(message); // already removes $$ and trim

    if (message === 'help') return this.helpMessage();

    const isCategory = message.startsWith('categoria');
    if (isCategory) return this.setExpenseCategory(message);

    const monthlyRemind = message.startsWith('gasto mensal');
    if(monthlyRemind) return this.registerMonthly(message);

    return await this.registerExpense(message);
  }

  /**
   * 
   * @returns {string} Help message with instructions on how to use the bot
   */
  helpMessage(): string {
    return `ZapFinance BOT para controle financeiro!\n
    Para registrar uma despesa:$$ nome da despesa valor categoria(opcional)
    Para definir a categoria de uma despesa: $$ categoria nome-da-despesa nome-da-categoria\n
    $$ help - exibe essa mensagem de ajuda`;
  }

  async setExpenseCategory(message: string) {
    const splitMessage = message.split(' ');
    if(splitMessage.length !== 3) return 'Mensagem inválida!';

    const name = this.util.slug(splitMessage[1]);
    const category = this.util.slug(splitMessage[2]);

    await this.db.setCategory(name, category);
  }

  /**
   * Register to db an expense
   * @param {string} message Message sent to bot with name and value of expense
   * @returns String if message is invalid. Void if everything is ok
   */
  async registerExpense(message: string): Promise<string | void> {
    const match = message.match(this.registerExpenseRegex);
    if (!match) return 'Mensagem inválida!';

    const name = this.util.slug(match[1].trim());
    const value = parseFloat(match[2]);
    const category = match[3] ? match[3]: undefined;

    const dbItem = this.prepareExpenseDB(name, value, category);
    await this.db.insertExpense(dbItem);
  }

  async registerMonthly(message: string){

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