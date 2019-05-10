import { Reader } from '../parser';

export const FullJson = {
  parse: (reader: Reader) => JSON.parse(reader.toString()),
  stringify: (value: any) => JSON.stringify(value)
};
