import { createConnection, Socket } from 'net';
import { AsyncLanguageService, MessageConnector } from '../../../shared/classes';
import { argWrapper, IMetadataItem } from '../../../shared/decorators/reviver';
const VETUR_PORT = process.env.VETUR_PORT ? +process.env.VETUR_PORT : 64278;
const fake = AsyncLanguageService.METADATA.map;
let bus: MessageConnector | undefined;
let runningService: ClientLanguageService | undefined;
export function createLanguageService(): ClientLanguageService {
  if (runningService) {
    return runningService;
  }
  return (runningService = new Fake(createRetryingConnection(), console.error) as any);
}
function noop() {}
class Fake extends AsyncLanguageService {
  getId() {
    return 'typescript';
  }
  public dispose(): void {}
  protected initWrapper(metadata: IMetadataItem): Function {
    return noop;
  }
}
export class ClientLanguageService extends AsyncLanguageService {
  getId() {
    return 'typescript';
  }
  public dispose(): void {
    this.bus$.dispose();
  }
  protected initWrapper(metadata: IMetadataItem): Function {
    return argWrapper(
      metadata.transforms,
      function(...args: any[]) {
        if (bus) {
          return bus.request(metadata.name, args);
        }
      },
      'stringify'
    );
  }
}

function createRetryingConnection() {
  const socket = createConnection({ port: VETUR_PORT });
  return socket
    .on('error', function retry() {
      socket.end();
      if (bus) {
        bus.dispose();
        bus = undefined;
      }
      setTimeout(createRetryingConnection, 1000);
    })
    .on('connect', function connected() {
      bus = new MessageConnector(socket, console.error);
      Object.assign(runningService, new ClientLanguageService(socket, console.error));
    });
}
