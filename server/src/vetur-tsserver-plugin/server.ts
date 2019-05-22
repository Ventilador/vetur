import { createServer, Socket } from 'net';
export function listen(port: number, onConnection: (val: Socket) => any, onError: (err: any) => any) {
  return createServer(function(socket: Socket) {
    onConnection(socket);
  })
    .on('error', onError)
    .listen(port);
}
