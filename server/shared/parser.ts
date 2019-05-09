import { ISerializer } from './serialization/types';

const valueFn = (val: any) => () => val;

export function toBuffer(obj: Move, serializer: ISerializer<Move>) {
  const asText = serializer.stringify(obj);
  return Buffer.from(asText.length + '|' + asText);
}
export function fromBuffer<T>(buffer: Buffer, serializer: ISerializer<T>): T {
  return serializer.parse(new Reader(buffer));
}

export class Reader {
  private static Empty: Reader = {
    toString: valueFn(''),
    slice: () => Reader.Empty,
    collect: valueFn([]),
    collectNumber: valueFn(0)
  } as any;
  private index: number;
  private text: string;
  private size: number;
  constructor(buf: Buffer | string, index = 0, size = 0) {
    this.index = index;
    this.text = buf.toString('utf-8');
    this.size = size || this.text.length;
  }

  toString() {
    return this.text.slice(this.index, this.size);
  }

  slice(amount: number) {
    if (!amount) {
      return Reader.Empty;
    }
    if (this.index + amount < this.text.length) {
      const other = new Reader(this.text, this.index, amount);
      this.index += amount;
      return other;
    }
    throw new Error('Out of bounds');
  }

  collect(amount: number): number[] {
    const arr = new Array(amount);
    for (let i = 0; i < amount; i++) {
      arr.push(this.collectNumber());
    }
    return arr;
  }

  collectNumber(): number {
    let collected = '';
    const text = this.text;
    const l = text.length;
    for (let i = this.index; i < l; i++) {
      if (isNumber(text[i])) {
        collected += text[i];
      } else {
        this.index = i + 1;
        return +collected;
      }
    }

    return +collected;
  }

  hasMore() {
    return this.index < this.text.length;
  }
}

function toLength(val: string) {
  return val.length;
}

function stringify(prev: string[], cur: Move, index: number) {
  switch (typeof cur) {
    case 'boolean':
    case 'number':
      cur = `${cur}`;
    case 'string':
      break;
    case 'object':
      const temp: any = cur;
      if (temp && temp.toMoved) {
        cur = temp.toMoved();
        break;
      }
    default:
      throw new Error(`Invalid MovingArg at index ${index}`);
  }
  prev.push(cur as string);
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
