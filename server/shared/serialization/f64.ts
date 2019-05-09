import { ISerializer } from './types';
import { Reader } from '../parser';

export const F64 = {
  parse: (val: Reader) => +val.collectNumber(),
  stringify: (val: number) => val + ''
} as ISerializer<number>;
