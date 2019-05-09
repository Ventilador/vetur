import { ISerializer } from './types';
import { TextDocument } from 'vscode-languageserver';
import { Reader } from '../parser';
import { Move } from '../decorators/move';
import { Thru } from './thru';
import { F64 } from './f64';
import { Serializer } from '../decorators/serializer';

export const Document = {
  parse: (value: Reader) => {},
  stringify: (value: TextDocument) => {
    return '';
  }
} as ISerializer<TextDocument>;

@Move()
export class Doc extends Serializer {
  @Move(Thru) fileName: string;
  @Move(F64) shift: number;
  @Move(F64) size: number;
}
