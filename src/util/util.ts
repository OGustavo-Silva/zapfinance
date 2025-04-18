import { IUtil } from '../interfaces/interfaces';

export class Util implements IUtil {
  slug(str: string): string {
    str = str.toLowerCase();
    str = str.replace(/[^a-z0-9 -]/g, '')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return str;
  }

  sleep(ms: number): void {
    setTimeout(() => { }, ms)
  }

  stringToTable(str: string) {
    const data = JSON.parse(str);

    if (!Array.isArray(data) || data.some(item => typeof item !== 'object' || item === null)) {
      return "Error: Input string does not represent an array of objects.";
    }

    const tableHeaderArr = Object.keys(data[0]);

    const headers = tableHeaderArr.reduce((acc, header) => {
      const sepLength = header.length / 4;
      const spaces = ' '.repeat(sepLength);
    
      const separator = spaces + "|" + spaces;
    
      acc += separator + header;
      return acc
    }, '')

  }
}