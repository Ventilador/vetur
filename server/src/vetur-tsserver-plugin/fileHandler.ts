import * as ts_module from 'typescript/lib/tsserverlibrary';
import { createServerHost } from './serverHost';
import { Handler } from './handler';
import { Socket } from 'net';
export function startLanguageService(
  connector: Socket,
  project: ts.server.Project,
  serverHost: ts.server.ServerHost,
  languageService: ts.LanguageService
) {
  return new Handler(connector, languageService, project, createServerHost(serverHost, project));
}
