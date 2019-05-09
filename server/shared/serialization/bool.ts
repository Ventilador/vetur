import { ISerializer } from './types';
import { Reader } from '../parser';

export const Bool = {
  parse: (val: Reader) => val.toString() !== '0',
  stringify: (val: boolean) => (val ? '1' : '0')
} as ISerializer<boolean>;
