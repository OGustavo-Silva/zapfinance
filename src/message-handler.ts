import { ZapFinanceDB } from "./db/database";
import { IDBItem, IExpense } from "./interfaces/interfaces";
import { Util } from "./util/util";

export class MessageHandler {
  regex = /^\$\$ .+/;
  registerExpenseRegex = /^(.*?)\s(\d+)(?:\s+(.*?))?$/;
  monthlyExpenseRegex = /desp mensal ([a-zA-Z\s]+)(\d*)?(\s[a-zA-Z]+)?/;

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

    if (message === 'ping') return 'pong';

    if (message === 'help') return this.helpMessage();

    const isCategory = message.startsWith('categoria');
    if (isCategory) return this.setExpenseCategory(message);

    const monthlyRemind = message.startsWith('desp mensal');
    if (monthlyRemind) return this.registerMonthly(message);

    return await this.registerExpense(message);
  }

  /**
   * 
   * @returns {string} Help message with instructions on how to use the bot
   */
  helpMessage(): string {
    return `ZapFinance BOT para controle financeiro!\n
    P/ registrar uma despesa:$$ nome da despesa valor categoria(opcional)
    P/ definir a categoria de uma despesa: $$ categoria nome-da-despesa nome-da-categoria
    P/ registrar uma despesa mensal: $$ desp mensal nome-da-despesa valor(opcional) categoria(opcional)
    \n$$ help - exibe essa mensagem de ajuda
    $$ ping - testar conexão
    Rep: https://github.com/OGustavo-Silva/zapfinance`;
  }

  async setExpenseCategory(message: string) {
    const splitMessage = message.split(' ');
    if (splitMessage.length !== 3) return 'Mensagem inválida!';

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
    const category = match[3] ? this.util.slug(match[3]) : undefined;

    const dbItem = this.prepareExpenseDB({ name, value, category });
    await this.db.insertExpense(dbItem);
  }

  /**
   * Register a monthly expense
   * @param {string} message 
   * @returns String if message is invalid. Void if everything is ok
   */
  async registerMonthly(message: string): Promise<string | void> {
    const match = message.match(this.monthlyExpenseRegex);
    if (!match) return 'Mensagem inválida';

    const [matchName, matchValue, matchCategory] = match;

    const name = this.util.slug(matchName);
    const value = parseFloat(matchValue);
    const category = matchCategory ? this.util.slug(matchCategory) : undefined;

    const isMonthly = 1;

    const dbItem = this.prepareExpenseDB({ name, value, category, isMonthly });
    await this.db.insertMonthlyExpense(dbItem);
  }

  /**
   * 
   * @param name expense name
   * @param value expense value
   * @returns {IDBItem} Object to be handled on db
   */
  prepareExpenseDB(expense: IExpense): IDBItem {
    const { name, value, category, isMonthly } = expense;
    const date = new Date().toISOString();

    return { name, category, value, date, isMonthly };
  }
}