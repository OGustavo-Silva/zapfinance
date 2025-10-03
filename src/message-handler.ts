import { Base } from "./base";
import { ZapFinanceDB } from "./db/database";
import { IDBItem, IExpense } from "./interfaces/interfaces";
import { DbItemsToStringTable } from "./util/helper";
import { Util } from "./util/util";

const COMMANDS_DESC: { [key: string]: string } = {
  'ping': 'testa conexão',
  'help': 'exibe mensagem básica de ajuda',
  'comandos': 'lista todos os comandos',
  'listar tudo': 'exibe todas as despesas',
  'categoria nome-da-despesa nome-da-categoria': 'define categoria de despesa por nome',
  'desp mensal nome-da-despesa valor(opcional) categoria(opcional)': 'registra despesa mensal',
  'apagar desp id': 'apaga uma despesa pelo id',
  'nome da despesa valor categoria(opcional)': 'registra nova despesa'
}

export class MessageHandler extends Base {
  shouldHandleMsgRegex = /^\$\$ .+/;
  util: Util;
  db: ZapFinanceDB;

  constructor(util: Util, db: ZapFinanceDB) {
    super();
    this.util = util;
    this.db = db;
  }

  async handle(FullMessage: string): Promise<string | void> {
    try {
      const isValid = this.shouldHandleMsgRegex.test(FullMessage); // Validates if message starts with $$
      if (!isValid) return;

      const message = FullMessage.replace('$$ ', '');

      if (message === 'ping') return 'pong';

      if (message === 'help') return this.helpMessage();

      if (message === 'comandos') return this.listCommands();

      if (message === 'listar tudo') return await this.listAll();

      const isCategory = message.startsWith('categoria');
      if (isCategory) return this.setExpenseCategory(message);

      const monthlyRemind = message.startsWith('desp mensal');
      if (monthlyRemind) return this.handleMonthly(message);

      const isDelete = message.startsWith('apagar desp');
      if (isDelete) return await this.deleteExpense(message);

      return await this.registerExpense(message);
    } catch (error) {
      this.log(`Error handling message: ${error}`);
      return 'Ocorreu um erro ao processar sua mensagem.';
    }

  }

  /**
   * @memberof MessageHandler
   * @returns {string} Help message with instructions on how to use the bot
   */
  helpMessage(): string {
    return `P/ registrar uma despesa:$$ nome da despesa valor categoria(opcional)
    P/ definir a categoria de uma despesa: $$ categoria nome-da-despesa nome-da-categoria
    P/ registrar uma despesa mensal: $$ desp mensal nome-da-despesa valor(opcional) categoria(opcional)
    \n$$ help - exibe essa mensagem de ajuda
    $$ comandos - para listar todos os comandos
    Rep: https://github.com/OGustavo-Silva/zapfinance`;
  }

  /**
   * @memberof MessageHandler
   * @returns {string} String listing all BOT commands
   */
  listCommands(): string {
    return Object.entries(COMMANDS_DESC).map(([command, desc]) => `\n$$ ${command} - ${desc}`).join('');
  }

  async listAll() {
    const allData = await this.db.listAll();
    return DbItemsToStringTable(allData);
  }

  async deleteExpense(message: string): Promise<string> {
    const numMessage = message.replace('apagar desp ', '');
    const parse = Number(numMessage);

    if (isNaN(parse)) return 'Mensagem inválida';

    await this.db.deleteById(parse);
    return 'Despesa apagada';
  }

  async setExpenseCategory(message: string): Promise<string | void> {
    const splitMessage = message.split(' ');
    if (splitMessage.length !== 3) return 'Mensagem inválida!';

    const name = this.util.slug(splitMessage[1]);
    const category = this.util.slug(splitMessage[2]);

    await this.db.setCategory(name, category);
    return 'Categoria definida';
  }

  /**
   * Register to db an expense
   * @memberof MessageHandler
   * @param {string} message Message sent to bot with name and value of expense
   * @returns String if message is invalid. Void if everything is ok
   */
  async registerExpense(message: string): Promise<string | void> {
    const registerExpenseRegex = /^(.*?)\s(\d+)(?:\s+(.*?))?$/;
    const match = message.match(registerExpenseRegex);
    if (!match) return 'Mensagem inválida!';

    const name = this.util.slug(match[1].trim());
    const value = parseFloat(match[2]);
    const category = match[3] ? this.util.slug(match[3]) : undefined;

    const dbItem = this.prepareExpenseDB({ name, value, category });
    await this.db.insertExpense(dbItem);
    return 'Despesa registrada';
  }

  /**
   * When message starts with 'desp mensal'
   */
  handleMonthly(message: string) {
    const monthlyExpenseRegex = /desp mensal ([a-zA-Z\s]+)(\d*)?(\s[a-zA-Z]+)?/;

    const match = message.match(monthlyExpenseRegex);
    if (!match) return 'Mensagem inválida';

    const [, matchName, matchValue, matchCategory] = match;

    const name = this.util.slug(matchName);
    const category = matchCategory ? this.util.slug(matchCategory) : undefined;
    const isNumber = this.isNumber(matchValue);

    if (isNumber) {
      const value = parseFloat(matchValue);
      this.registerMonthly(name, value, category);
    }
    else if (!isNumber && !matchValue) {
      return 'TODO';
      // validar mensagem com 'pago' e atualizar bd(msgs podem conter espaco no nome)
    }
    return 'Mensagem inválida';
  }

  /**
   * Registers a monthly expense
   */
  async registerMonthly(name: string, value: number, category?: string): Promise<string | void> {
    const isMonthly = 1;

    const dbItem = this.prepareExpenseDB({ name, value, category, isMonthly });
    await this.db.insertMonthlyExpense(dbItem);
    return 'Despesa mensal registrada';
  }

  /**
   * Converts expense data do DB format
   */
  prepareExpenseDB(expense: IExpense): IDBItem {
    const { name, value, category, isMonthly } = expense;
    const date = new Date().toISOString();

    return { name, category, value, date, isMonthly };
  }

  isNumber(str: string): boolean {
    return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
  }
}