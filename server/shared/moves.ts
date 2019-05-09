import { Position as Position_ } from 'vscode-languageserver-types';
export class Position implements Position_, IMove {
  line: number;
  character: number;
  toMoved() {
    return [this.line, this.character];
  }
}
