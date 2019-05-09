import { ISerializer } from './types';
import { Reader } from '../parser';

export const Thru = {
  parse: thru,
  stringify: thru
} as ISerializer<string>;
function thru(val: Reader | string): string {
  return typeof val === 'string' ? val : val.toString();
}
