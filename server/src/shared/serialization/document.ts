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
export class DocWithText extends Serializer {
  constructor(doc: TextDocument) {
    super();
    this.uri = doc.uri;
    this.content = '';
    this.shift = 0;
    this.size = 0;
  }
  @Move(Thru) uri: string;
  @Move(Thru) content: string;
  @Move(F64) shift: number;
  @Move(F64) size: number;
}

@Move()
export class Doc extends Serializer {
  @Move(Thru) uri: string;
}
