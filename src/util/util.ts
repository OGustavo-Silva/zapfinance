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
}