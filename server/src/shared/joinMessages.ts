import { isNumber } from './parser';
import { Readable } from 'stream';

export function messageJoiner(socket: Readable, push: (data: any) => void) {
  socket.on('data', transform);
  let chained = '';
  let size: number; // has the size of the next chunk to read for example "17|this are 17 chars"
  function transform(data: Buffer) {
    chained += data.toString('utf8');

    let index = 0;
    for (let size = calculateSize(); size + index + 1 < chained.length; size = calculateSize()) {
      index += size.toString().length + 1;
      // while the buffer has responses
      push(chained.slice(index, index + size)); // push the chunk into the stream
      index += size; // increment "size" to the index so next slices are done from there (skip already read)
    }

    if (index) {
      chained = chained.slice(index); // skip already read
    }
  }
  function calculateSize(): number {
    let collected = '';
    const text = chained;
    const l = text.length;
    for (let i = 0; i < l; i++) {
      if (isNumber(text[i])) {
        collected += text[i];
      } else {
        return (size = +collected);
      }
    }

    return 0;
  }
}
