import { MessageConnector } from '../shared/classes';
import { ISerializer } from '../shared/serialization/types';
export function Callable<T extends { connector: MessageConnector }>(proto: T, name: keyof T) {
  getArray(proto).push({
    name,
    args: null
  });
}

export function flush<T extends { connector: MessageConnector }>(instance: T) {
  const id = 0;
}

export function Reviver<T>(c: ISerializer<T>) {
  return function(proto: any, name: string, index: number) {};
}

const _flush = Symbol('flush');
function getArray(proto: any) {
  return proto[_flush] || (proto[_flush] = []);
}
