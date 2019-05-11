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
import { DefinitionInfo } from 'typescript';
const { server, ScriptKind } = ts;

export class Handler implements ts.LanguageService {
  public connector: MessageConnector;
  constructor(
    _socket: Socket,
    private _languageService: ts.LanguageService,
    private _project: ts.server.Project,
    private _host: ServerHost
  ) {
    this.connector = new MessageConnector(_socket, null as any);
  }

  cleanupSemanticCache(): void {
    throw new Error('Method not implemented.');
  }

  getSyntacticDiagnostics(fileName: string): ts.DiagnosticWithLocation[] {
    throw new Error('Method not implemented.');
  }

  getSemanticDiagnostics(fileName: string): ts.Diagnostic[] {
    throw new Error('Method not implemented.');
  }

  getSuggestionDiagnostics(fileName: string): ts.DiagnosticWithLocation[] {
    throw new Error('Method not implemented.');
  }

  getCompilerOptionsDiagnostics(): ts.Diagnostic[] {
    throw new Error('Method not implemented.');
  }

  getSyntacticClassifications(fileName: string, span: ts.TextSpan): ts.ClassifiedSpan[] {
    throw new Error('Method not implemented.');
  }

  getSemanticClassifications(fileName: string, span: ts.TextSpan): ts.ClassifiedSpan[] {
    throw new Error('Method not implemented.');
  }

  getEncodedSyntacticClassifications(fileName: string, span: ts.TextSpan): ts.Classifications {
    throw new Error('Method not implemented.');
  }

  getEncodedSemanticClassifications(fileName: string, span: ts.TextSpan): ts.Classifications {
    throw new Error('Method not implemented.');
  }

  getCompletionEntrySymbol(
    fileName: string,
    position: number,
    name: string,
    source: string | undefined
  ): ts.Symbol | undefined {
    throw new Error('Method not implemented.');
  }

  getNameOrDottedNameSpan(fileName: string, startPos: number, endPos: number): ts.TextSpan | undefined {
    throw new Error('Method not implemented.');
  }

  getBreakpointStatementAtPosition(fileName: string, position: number): ts.TextSpan | undefined {
    throw new Error('Method not implemented.');
  }

  getRenameInfo(fileName: string, position: number, options?: ts.RenameInfoOptions | undefined): ts.RenameInfo {
    throw new Error('Method not implemented.');
  }

  findRenameLocations(
    fileName: string,
    position: number,
    findInStrings: boolean,
    findInComments: boolean,
    providePrefixAndSuffixTextForRename?: boolean | undefined
  ): readonly ts.RenameLocation[] | undefined {
    throw new Error('Method not implemented.');
  }

  getDefinitionAndBoundSpan(fileName: string, position: number): ts.DefinitionInfoAndBoundSpan | undefined {
    throw new Error('Method not implemented.');
  }

  getTypeDefinitionAtPosition(fileName: string, position: number): readonly ts.DefinitionInfo[] | undefined {
    throw new Error('Method not implemented.');
  }

  getImplementationAtPosition(fileName: string, position: number): readonly ts.ImplementationLocation[] | undefined {
    throw new Error('Method not implemented.');
  }

  findReferences(fileName: string, position: number): ts.ReferencedSymbol[] | undefined {
    throw new Error('Method not implemented.');
  }

  getDocumentHighlights(
    fileName: string,
    position: number,
    filesToSearch: string[]
  ): ts.DocumentHighlights[] | undefined {
    throw new Error('Method not implemented.');
  }

  getNavigateToItems(
    searchValue: string,
    maxResultCount?: number | undefined,
    fileName?: string | undefined,
    excludeDtsFiles?: boolean | undefined
  ): ts.NavigateToItem[] {
    throw new Error('Method not implemented.');
  }

  getNavigationTree(fileName: string): ts.NavigationTree {
    throw new Error('Method not implemented.');
  }

  getOutliningSpans(fileName: string): ts.OutliningSpan[] {
    throw new Error('Method not implemented.');
  }

  getTodoComments(fileName: string, descriptors: ts.TodoCommentDescriptor[]): ts.TodoComment[] {
    throw new Error('Method not implemented.');
  }
  getBraceMatchingAtPosition(fileName: string, position: number): ts.TextSpan[] {
    throw new Error('Method not implemented.');
  }

  getIndentationAtPosition(fileName: string, position: number, options: ts.EditorOptions | ts.EditorSettings): number {
    throw new Error('Method not implemented.');
  }

  getFormattingEditsForDocument(
    fileName: string,
    options: ts.FormatCodeOptions | ts.FormatCodeSettings
  ): ts.TextChange[] {
    throw new Error('Method not implemented.');
  }

  getFormattingEditsAfterKeystroke(
    fileName: string,
    position: number,
    key: string,
    options: ts.FormatCodeOptions | ts.FormatCodeSettings
  ): ts.TextChange[] {
    throw new Error('Method not implemented.');
  }

  getDocCommentTemplateAtPosition(fileName: string, position: number): ts.TextInsertion | undefined {
    throw new Error('Method not implemented.');
  }

  isValidBraceCompletionAtPosition(fileName: string, position: number, openingBrace: number): boolean {
    throw new Error('Method not implemented.');
  }

  getJsxClosingTagAtPosition(fileName: string, position: number): ts.JsxClosingTagInfo | undefined {
    throw new Error('Method not implemented.');
  }

  getSpanOfEnclosingComment(fileName: string, position: number, onlyMultiLine: boolean): ts.TextSpan | undefined {
    throw new Error('Method not implemented.');
  }

  getCombinedCodeFix(
    scope: ts.CombinedCodeFixScope,
    fixId: {},
    formatOptions: ts.FormatCodeSettings,
    preferences: ts.UserPreferences
  ): ts.CombinedCodeActions {
    throw new Error('Method not implemented.');
  }

  applyCodeActionCommand(
    action: ts.CodeActionCommand,
    formatSettings?: ts.FormatCodeSettings | undefined
  ): Promise<ts.ApplyCodeActionCommandResult>;
  applyCodeActionCommand(
    action: ts.CodeActionCommand[],
    formatSettings?: ts.FormatCodeSettings | undefined
  ): Promise<ts.ApplyCodeActionCommandResult[]>;
  applyCodeActionCommand(
    action: ts.InstallPackageAction | ts.GenerateTypesAction | ts.CodeActionCommand[],
    formatSettings?: ts.FormatCodeSettings | undefined
  ): Promise<ts.ApplyCodeActionCommandResult | ts.ApplyCodeActionCommandResult[]>;
  applyCodeActionCommand(fileName: string, action: ts.CodeActionCommand): Promise<ts.ApplyCodeActionCommandResult>;
  applyCodeActionCommand(fileName: string, action: ts.CodeActionCommand[]): Promise<ts.ApplyCodeActionCommandResult[]>;
  applyCodeActionCommand(
    fileName: string,
    action: ts.InstallPackageAction | ts.GenerateTypesAction | ts.CodeActionCommand[]
  ): Promise<ts.ApplyCodeActionCommandResult> | Promise<ts.ApplyCodeActionCommandResult[]>;
  applyCodeActionCommand(fileName: any, action?: any): any {
    throw new Error('Method not implemented.');
  }
  organizeImports(
    scope: ts.CombinedCodeFixScope,
    formatOptions: ts.FormatCodeSettings,
    preferences: ts.UserPreferences | undefined
  ): readonly ts.FileTextChanges[] {
    throw new Error('Method not implemented.');
  }
  getEditsForFileRename(
    oldFilePath: string,
    newFilePath: string,
    formatOptions: ts.FormatCodeSettings,
    preferences: ts.UserPreferences | undefined
  ): readonly ts.FileTextChanges[] {
    throw new Error('Method not implemented.');
  }
  getEmitOutput(fileName: string, emitOnlyDtsFiles?: boolean | undefined): ts.EmitOutput {
    throw new Error('Method not implemented.');
  }
  getProgram(): ts.Program | undefined {
    throw new Error('Method not implemented.');
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
    @Reviver(FullJson) config: any,
    @Reviver(Thru) source: string
  ): ts.CompletionEntryDetails | undefined {
    return this._languageService.getCompletionEntryDetails(
      fileName,
      offset,
      label,
      config, // todo suport other configs?
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

  getDefinitionAtPosition(@Reviver(Thru) fileName: string, @Reviver(F64) offset: number): readonly DefinitionInfo[] {
    return this._languageService.getDefinitionAtPosition(fileName, offset) || [];
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
    @Reviver(ArrayOf(F64)) fixableDiagnosticCodes: number[],
    @Reviver(FullJson) formatSettings: ts.FormatCodeSettings
  ): readonly ts.CodeFixAction[] {
    return this._languageService.getCodeFixesAtPosition(
      fileName,
      start,
      end,
      fixableDiagnosticCodes,
      formatSettings,
      /*preferences*/ {}
    ) as any;
  }

  getApplicableRefactors(
    @Reviver(Thru) fileName: string,
    @Reviver(FullJson) range: ts.TextRange
  ): ts.ApplicableRefactorInfo[] {
    return this._languageService.getApplicableRefactors(fileName, range, /*preferences*/ {});
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
