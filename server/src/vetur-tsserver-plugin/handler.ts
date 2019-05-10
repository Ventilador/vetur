import { Socket } from 'net';
import { MessageConnector } from '../shared/classes';
import * as ts from 'typescript/lib/tsserverlibrary';
import { ServerHost } from './serverHost';
import { Bool } from '../shared/serialization/bool';
import { F64 } from '../shared/serialization/f64';
import { Thru } from '../shared/serialization/thru';
import { ArrayOf } from '../shared/serialization/arrayOf';
import { FullJson } from '../shared/serialization/json';
import { Doc } from '../shared/serialization/document';
import { TextDocument } from 'vscode-languageserver';
import { Reviver } from '../shared/decorators';
const { server, ScriptKind } = ts;
export class Handler {
  public connector: MessageConnector;
  constructor(
    _socket: Socket,
    private _languageService: ts.LanguageService,
    private _project: ts.server.Project,
    private _host: ServerHost
  ) {
    this.connector = new MessageConnector(_socket, null as any);
  }

  updateFile(@Reviver(Doc) file: TextDocument) {
    const path = server.toNormalizedPath(file.uri);

    this._host.updateFile(path, file.getText());

    let info = this._project.getScriptInfo(path);
    if (!info) {
      info = new server.ScriptInfo(this._host, path, ScriptKind.TS, true, path as any);
      this._project.addRoot(info);
    }
    info.reloadFromFile(path);
  }

  getDiagnosticWithLocation(@Reviver(Thru) fileName: string): ts.DiagnosticWithLocation[] {
    return [
      ...this._languageService.getSyntacticDiagnostics(fileName),
      ...(this._languageService.getSemanticDiagnostics(fileName) as any)
    ];
  }

  onDocumentRemoved(@Reviver(Thru) fileName: string): void {
    // let info = this._project.getScriptInfo(fileName);
    // if (info) {
    //     this._project.removeFile(info, true, true);
    // }
  }

  dispose(): void {
    this.connector.dispose();
  }

  getCompletionsAtPosition(
    @Reviver(Thru) fileName: string,
    @Reviver(F64) offset: number
  ): ts.WithMetadata<ts.CompletionInfo> {
    return (
      this._languageService.getCompletionsAtPosition(fileName, offset, {
        includeCompletionsWithInsertText: true
        // includeCompletionsForModuleExports: _.get(config, ['vetur', 'completion', 'autoImport'])
      }) || ({ isIncomplete: false, items: [] } as any)
    );
  }
  getCompletionEntryDetails(
    @Reviver(Thru) fileName: string,
    @Reviver(F64) offset: number,
    @Reviver(Thru) label: string,
    @Reviver(Thru) source: string
  ): ts.CompletionEntryDetails | undefined {
    return this._languageService.getCompletionEntryDetails(
      fileName,
      offset,
      label,
      undefined, // todo suport other configs?
      source,
      {
        importModuleSpecifierEnding: 'minimal',
        importModuleSpecifierPreference: 'relative',
        includeCompletionsWithInsertText: true
      }
    );
  }
  getQuickInfoAtPosition(@Reviver(Thru) fileName: string, @Reviver(F64) offset: number): ts.QuickInfo | undefined {
    return this._languageService.getQuickInfoAtPosition(fileName, offset);
  }
  getSignatureHelpItems(
    @Reviver(Thru) fileName: string,
    @Reviver(F64) offset: number
  ): ts.SignatureHelpItems | undefined {
    return this._languageService.getSignatureHelpItems(fileName, offset, undefined);
  }

  getOccurrencesAtPosition(
    @Reviver(Thru) fileName: string,
    @Reviver(F64) offset: number
  ): ts.ReferenceEntry[] | undefined {
    return this._languageService.getOccurrencesAtPosition(fileName, offset) as any;
  }

  getNavigationBarItems(@Reviver(Thru) fileName: string): ts.NavigationBarItem[] {
    return this._languageService.getNavigationBarItems(fileName);
  }

  getDefinitionAtPosition(
    @Reviver(Thru) fileName: string,
    @Reviver(F64) offset: number
  ): { fileName: string; textSpan: ts.TextSpan }[] {
    return (this._languageService.getDefinitionAtPosition(fileName, offset) || []).map(d => ({
      fileName: d.fileName,
      textSpan: d.textSpan
    }));
  }

  getReferencesAtPosition(
    @Reviver(Thru) fileName: string,
    @Reviver(F64) offset: number
  ): ts.ReferenceEntry[] | undefined {
    return this._languageService.getReferencesAtPosition(fileName, offset);
  }

  getCodeFixesAtPosition(
    @Reviver(Thru) fileName: string,
    @Reviver(F64) start: number,
    @Reviver(F64) end: number,
    @Reviver(F64) tabSize: number,
    @Reviver(Bool) convertTabsToSpaces: boolean,
    @Reviver(F64) indentSize: number,
    @Reviver(ArrayOf(F64)) fixableDiagnosticCodes: number[]
  ): ts.CodeFixAction[] {
    return this._languageService.getCodeFixesAtPosition(
      fileName,
      start,
      end,
      fixableDiagnosticCodes,
      { tabSize, convertTabsToSpaces, indentSize },
      /*preferences*/ {}
    ) as any;
  }

  getApplicableRefactors(
    @Reviver(Thru) fileName: string,
    @Reviver(F64) pos: number,
    @Reviver(F64) end: number
  ): ts.ApplicableRefactorInfo[] {
    return this._languageService.getApplicableRefactors(fileName, { pos, end }, /*preferences*/ {});
  }

  getEditsForRefactor(@Reviver(FullJson) args: any): ts.RefactorEditInfo | undefined {
    return this._languageService.getEditsForRefactor(
      args.fileName,
      args.formatOptions,
      args.textRange,
      args.refactorName,
      args.actionName,
      args.preferences
    );
  }

  getFormattingEditsForRange(
    @Reviver(Thru) fileName: string,
    @Reviver(F64) start: number,
    @Reviver(F64) end: number,
    @Reviver(FullJson) convertedFormatSettings: ts.FormatCodeOptions | ts.FormatCodeSettings
  ): ts.TextChange[] {
    return this._languageService.getFormattingEditsForRange(fileName, start, end, convertedFormatSettings);
  }
}
