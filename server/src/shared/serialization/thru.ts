import { ISerializer } from './types';
import { Reader } from '../parser';

export const Thru = {
  parse: thru,
  stringify: thru
} as ISerializer<string>;
function thru(val: Reader | string): string {
  return typeof val === 'string' ? val : val.toString();
}
const tracker = Symbol('tracker');
export function FromEnum(enm: any): ISerializer<any> {
  if (enm[tracker]) {
    return enm[tracker];
  }
  return (enm[tracker] = {
    parse: (val: Reader) => enm[val.collectNumber()],
    stringify: (val: any) => enm[val] + ''
  });
}
