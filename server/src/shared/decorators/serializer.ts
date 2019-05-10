import { Reader } from '../parser';

export class Serializer {
  static parse<T extends Serializer>(_: Reader): T {
    return null as any;
  }
  static stringify<T extends Serializer>(_: T) {
    return '';
  }
}
