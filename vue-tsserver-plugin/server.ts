import { createServer, Socket } from 'net';
import { Parser, IMessage } from './bufferConnector';
export function listen(port: number, onConnection: (val: MessageConnector) => any, onError: (err: any) => any) {
  const server = createServer(function(socket: Socket) {
    onConnection(new MessageConnector(socket, onError));
  });
  server.listen(port, '127.0.0.1');
}

export class MessageConnector {
  private listeners: any[];
  constructor(private _socket: Socket, private _onError: (err: any) => any) {
    _socket.on('data', onData);
    const listeners = (this.listeners = []);
    function onData(data: Buffer) {
      Parser.fromBufferToMessage(data, dispatchData);
    }
    function dispatchData(value: IMessage) {
      if (listeners.length) {
        listeners.forEach(callSafe, value);
      }
    }
    function callSafe(this: IMessage, cb: OnMessageReceived) {
      try {
        cb(this);
      } catch (err) {
        _onError(err);
      }
    }
  }

  onData(cb: OnMessageReceived) {
    let listeners = this.listeners;
    listeners.push(cb);
    return function() {
      if (listeners) {
        const index = listeners.indexOf(cb);
        if (index !== -1) {
          listeners.splice(index, 1);
          cb = listeners = null as any;
        }
      }
    };
  }
  write(value: IMessage) {
    try {
      return this._socket.write(Parser.fromMessageToBuffer(value));
    } catch (err) {
      this._onError(err);
    }
  }
}

export type OnMessageReceived = (message: IMessage) => any;
