import { MessageConnector } from '../../../shared/classes';

export function Callable<T extends { connector: MessageConnector }>(proto: T, name: keyof T) {
  getArray(proto).push({
    name,
    args: null
  });
}

export function flush<T extends { connector: MessageConnector }>(instance: T) {
  const id = 0;
}

const _flush = Symbol('flush');
function getArray(proto: any) {
  return proto[_flush] || (proto[_flush] = []);
}
