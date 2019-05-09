import { Reader } from '../parser';

export class Serializer {
  static parse<T extends Serializer>(_: Reader) {
    return null as T;
  }
  static stringify<T extends Serializer>(_: T) {
    return '';
  }
}
