import { Socket } from 'net';
import { IMessage, Parser } from './parser';

export class MessageConnector {
  private _channel: Channel;

  constructor(private _socket: Socket, private _onError: (err: any) => any) {
    _socket.on('data', onData);
    function onData(data: Buffer) {
      Parser.fromBufferToMessage(data, dispatchData);
    }
    const channel = (this._channel = new Channel());
    function dispatchData(value: IMessage) {
      if (value.type === 'response') {
        const id = +value.id;
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

      if (value.type === 'error') {
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
      this._socket.write(
        Parser.fromMessageToBuffer({
          type: 'response',
          id,
          action,
          args
        })
      );
    });
  }

  dispose() {
    this._socket.end();
  }

  write(action: string, args: any[] = []) {
    try {
      return this._socket.write(
        Parser.fromMessageToBuffer({
          type: 'send',
          id: 0,
          action,
          args
        })
      );
    } catch (err) {
      this._onError(err);
    }
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

export type OnMessageReceived = (message: IMessage) => any;
