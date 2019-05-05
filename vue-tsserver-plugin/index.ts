import * as ts_module from 'typescript/lib/tsserverlibrary';
import { listen, MessageConnector } from './server';
import { createLanguageService } from './fileHandler';
// import { activate } from './extension';
// import { typescript } from './utils/languageModeIds';
const VETUR_PORT = process.env.VETUR_PORT ? +process.env.VETUR_PORT : 83887;
function init({ typescript: ts }: { typescript: typeof ts_module }) {
  return { create };

  function create(info: ts.server.PluginCreateInfo) {
    // Diagnostic logging
    info.project.projectService.logger.info("I'm getting set up now! Check the log for this message.");
    const serverHost = info.serverHost;

    const project = info.project;
    listen(
      VETUR_PORT,
      function(connector: MessageConnector) {
        createLanguageService(connector, project, serverHost);
      },
      function onError(err: any) {
        project.projectService.logger.msg(toString(err), ts.server.Msg.Err);
      }
    );
    return info.languageService;
  }
}

function toString(err: any) {
  if (typeof err === 'string') {
    return err;
  }
  if (err.toString) {
    return err.toString();
  }
  return err + '';
}

export = init;
