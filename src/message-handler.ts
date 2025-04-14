import { Util } from "./util/util";

export class MessageHandler {
  regex = /\$\$ .+/;
  util: Util;

  constructor(util: Util) { this.util = util }

  handle(message: string): string | null {
    const isValid = this.regex.test(message); // Validates if message starts with $$
    if (!isValid) return null;

    const slugMessage = this.util.slug(message);
    const res = this.registerExpense(slugMessage);

    return res;
  }

  registerExpense(message: string): string {
    const [name, valueStr] = message.split('-');

    const value = parseFloat(valueStr);
    if (isNaN(value)) return 'Valor informado inválido!';

    return `Gasto registrado: ${name} - R$ ${value.toFixed(2)}`;
  }
}