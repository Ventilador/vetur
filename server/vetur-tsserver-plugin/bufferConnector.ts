export interface IMessage {
  action: string;
  args?: MovingArg[];
}

export type MovingArg = string | number | boolean | boolean | IMove;

export interface IMove {
  toMoved(): string;
}

export class Parser {
  private static _toBuffer = global.Buffer && global.Buffer.from;
  static toBuffer = Parser.prototype.toBuffer;
  static fromBuffer = Parser.prototype.fromBuffer;
  static fromMessageToBuffer = Parser.prototype.fromMessageToBuffer;
  static fromBufferToMessage = Parser.prototype.fromBufferToMessage;
  static fromBufferSync = Parser.prototype.fromBufferSync;
  static fromBufferToMessageSync = Parser.prototype.fromBufferToMessageSync;

  constructor(private _toBuffer: (val: string, encoding: string) => any = thru) {}
  toBuffer(metadata: string[]): Buffer {
    const sizes = metadata.map(toLength);
    return this._toBuffer([sizes.join('|'), metadata.join('')].join('-'), 'utf8');
  }
  fromBuffer(buffer: Buffer | string, cb: (val: string[]) => any): void {
    const reader = new Reader(buffer);
    while (reader.hasMore()) {
      cb(collect(reader));
    }
  }
  fromMessageToBuffer(message: IMessage) {
    const args = [message.action];
    if (message.args && message.args.length) {
      message.args.reduce(stringify, args);
    }
    return this.toBuffer(args);
  }
  fromBufferToMessage(buffer: Buffer, cb: (val: IMessage) => any) {
    return this.fromBuffer(buffer, function(message: string[]) {
      cb(fromArrayToMessage(message));
    });
  }
  fromBufferSync(buffer: Buffer): string[] {
    const reader = new Reader(buffer);
    const toReturn = collect(reader);
    if (reader.hasMore()) {
      throw new Error('Invalid buffer');
    }
    return toReturn;
  }
  fromBufferToMessageSync(buffer: Buffer): IMessage {
    return fromArrayToMessage(Parser.fromBufferSync(buffer));
  }
}

function thru(v: any) {
  return v;
}

function fromArrayToMessage(message: string[]): IMessage {
  return {
    action: message[0],
    args: message.slice(3)
  };
}

function collect(reader: Reader) {
  const sizes: number[] = [];
  const args: string[] = [];
  while (reader.current !== '-') {
    sizes.push(+reader.collectNumber());
  }

  return sizes.map(s => reader.sliceNext(s));
}

class Reader {
  private index = 0;
  public readonly current: string = '';
  private text: string;
  constructor(buf: Buffer | string) {
    this.text = buf.toString('utf-8');
  }

  sliceNext(amount: number) {
    if (this.index + amount <= this.text.length) {
      const text = this.text.slice(this.index, (this.index += amount));
      (this as { current: string }).current = text[this.index];
      return text;
    }
    throw new Error('Out of bounds');
  }

  collectNumber() {
    let collected = '';
    const text = this.text;
    const l = text.length;
    for (let i = this.index; i < l; i++) {
      if (isNumber(text[i])) {
        collected += text[i];
      } else {
        (this as { current: string }).current = text[i];
        this.index = i + 1;
        return collected;
      }
    }
    this.index = l;
    return collected;
  }

  hasMore() {
    return this.index < this.text.length;
  }
}

function toLength(val: string) {
  return val.length;
}

function stringify(prev: string[], cur: MovingArg, index: number) {
  switch (typeof cur) {
    case 'boolean':
    case 'number':
      cur = `${cur}`;
    case 'string':
      break;
    case 'object':
      if (cur && cur.toMoved) {
        cur = cur.toMoved();
        break;
      }
    default:
      throw new Error(`Invalid MovingArg at index ${index}`);
  }
  prev.push(cur);
  return prev;
}

function isNumber(str: string) {
  return (
    str === '1' ||
    str === '2' ||
    str === '3' ||
    str === '4' ||
    str === '5' ||
    str === '6' ||
    str === '7' ||
    str === '8' ||
    str === '9' ||
    str === '0'
  );
}
