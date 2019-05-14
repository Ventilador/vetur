import * as ts_module from 'typescript/lib/tsserverlibrary';
import { createServerHost } from './serverHost';
import { Handler } from './handler';
import { Socket } from 'net';
import { AsyncLanguageService, MessageConnector } from '../shared/classes';
import { argWrapper } from '../shared/decorators/reviver';
import { TextDocument } from 'vscode-languageserver';
import { getLanguageModelCache } from '../server/embeddedSupport/languageModelCache';
export function startLanguageService(
  connector: Socket,
  project: ts.server.Project,
  serverHost: ts.server.ServerHost,
  languageService: ts.LanguageService
) {

  return new Handler(connector, languageService, null as any, project, createServerHost(serverHost, project));
}
