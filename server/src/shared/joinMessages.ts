import { Transform } from 'stream';
import { isNumber } from './parser';

export class JoinMessages extends Transform {
  // chunks can land mid way (for example when sendind big files),
  // so we need to keep the old ones until we make a valid chunk
  private chained = '';
  private size: number; // has the size of the next chunk to read for example "17|this are 17 chars"
  _transform(data: Buffer) {
    this.chained += data.toString('utf8');
    if (!this.size) {
      // if no size, try to calculate now
      this.size = this.calculateSize();
    }
    let index = 0;
    while (this.chained.length > this.size) {
      // while the buffer has responses
      this.push(this.chained.slice(index, this.size)); // push the chunk into the stream
      index += this.size; // increment that to the index so next slices are done from there (skip already read)
      this.size = this.calculateSize(); // calculate size, if it reaches end of chunk, returns 0, might be more numbers
      index += this.size; // size can be 0 or a number, so add any result
    }
    if (index) {
      this.chained = this.chained.slice(index); // skip already read
    }
  }

  private calculateSize(): number {
    let collected = '';
    const text = this.chained;
    const l = text.length;
    for (let i = 0; i < l; i++) {
      if (isNumber(text[i])) {
        collected += text[i];
      } else {
        return (this.size = +collected);
      }
    }

    return 0;
  }
}
