import { Socket } from 'net';
import { fromBuffer, toBuffer } from './parser';
import { JoinMessages } from './joinMessages';
import { SocketMessage, MessageType } from './serialization/socketMessage';

export class MessageConnector {
  private _channel: Channel;

  constructor(private _socket: Socket, private _onError: (err: any) => any) {
    _socket.pipe(new JoinMessages()).on('data', onData);
    function onData(data: Buffer) {
      dispatchData(fromBuffer<SocketMessage>(data, SocketMessage));
    }
    const channel = (this._channel = new Channel());
    function dispatchData(value: SocketMessage) {
      if (value.type === MessageType.Response) {
        const id = +value.args.shift()!;
        if (isNaN(id)) {
          _onError(new Error('Invalid id response'));
          return;
        }
        const cb = channel.get(id);
        if (!cb) {
          _onError(new Error('Id has no reponse'));
          return;
        }

        cb.apply(null, value.args);
        return;
      }

      if (value.type === MessageType.Error) {
        _onError.apply(null, value.args as any);
        return;
      }
    }
  }

  request<T>(action: string, args: any[] = []): Promise<T> {
    return new Promise((res, rej) => {
      const id = this._channel.put((err, result) => {
        if (err) {
          rej(err);
        } else {
          res(result);
        }
      });
      args.unshift(id);
      this._socket.write(
        toBuffer<SocketMessage>(
          {
            type: MessageType.Request,
            action,
            args
          },
          SocketMessage
        )
      );
    });
  }

  dispose() {
    this._socket.end();
  }
}

class Channel {
  private channels: Record<number, Function | undefined> = Object.create(null);
  private available: number[] = [];
  private len = 0;
  put(cb: (err: Error, result?: any) => any) {
    const id = this.available.length ? this.available.pop()! : this.len++;
    const self = this;
    this.channels[id] = function() {
      self.channels[id] = undefined;
      self.available.push(id);
      return cb.apply(this, arguments as any);
    };
    return id;
  }
  get(id: number) {
    return this.channels[id];
  }
}
