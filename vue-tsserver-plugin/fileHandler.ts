import * as ts_module from 'typescript/lib/tsserverlibrary';
import { MessageConnector } from './server';
import { createServerHost } from './serverHost';
const ScriptInfo = ts_module.server.ScriptInfo;
const toNormalizedPath = ts_module.server.toNormalizedPath;
export function createLanguageService(
  connector: MessageConnector,
  project: ts.server.Project,
  serverHost: ts.server.ServerHost
) {
  connector.onData(message => {
    if (handler[message.action]) {
      if (message.args) {
        handler[message.action](...message.args);
      } else {
        handler[message.action]();
      }
    }
  });

  const handler = { addFile: updateFile } as IHandler;
  const host = createServerHost(serverHost, project);
  return;
  function updateFile(fileName: string, fileContent: string) {
    const path = toNormalizedPath(fileName);

    // update file in "fs";
    host.updateFile(fileName, fileContent);

    let info = project.getScriptInfo(path);
    if (!info) {
      info = new ScriptInfo(host, path, ts_module.ScriptKind.TS, true, fileName as any);
      project.addRoot(info);
    }
    info.reloadFromFile(path);
  }
}

export interface IHandler extends Record<string, Function> {
  addFile(fileName: string, fileContent: string): Promise<void>;
}
