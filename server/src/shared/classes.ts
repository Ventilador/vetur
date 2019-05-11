import { Socket } from 'net';
import { fromBuffer, toBuffer } from './parser';
import { JoinMessages } from './joinMessages';
import { SocketMessage, MessageType } from './serialization/socketMessage';
import {
  EmitOutput,
  FormatCodeSettings,
  TextRange,
  CodeActionCommand,
  JsxClosingTagInfo,
  TextInsertion,
  FormatCodeOptions,
  EditorOptions,
  TextSpan,
  OutliningSpan,
  NavigationBarItem,
  ReferenceEntry,
  ImplementationLocation,
  NavigateToItem,
  DefinitionInfo,
  SignatureHelpItemsOptions,
  RenameInfoOptions,
  Classifications,
  ClassifiedSpan,
  RefactorEditInfo,
  OrganizeImportsScope
} from 'typescript/lib/tsserverlibrary';
import {
  UserPreferences,
  ApplyCodeActionCommandResult,
  ApplicableRefactorInfo,
  FileTextChanges,
  LineAndCharacter,
  TextChange,
  EditorSettings,
  TodoComment,
  TodoCommentDescriptor,
  NavigationTree,
  CombinedCodeFixScope,
  CombinedCodeActions,
  ReferencedSymbol,
  DocumentHighlights,
  DefinitionInfoAndBoundSpan,
  RenameInfo,
  SignatureHelpItems,
  GetCompletionsAtPositionOptions,
  QuickInfo,
  WithMetadata,
  CompletionInfo,
  DiagnosticWithLocation,
  CompletionEntryDetails,
  RenameLocation,
  CodeFixAction
} from 'typescript';
import { Diagnostic } from 'vscode-languageserver';

export interface LanguageServiceAsync {
  cleanupSemanticCache(): Promise<void>;
  getSyntacticDiagnostics(fileName: string): Promise<DiagnosticWithLocation[]>;
  getSemanticDiagnostics(fileName: string): Promise<Diagnostic[]>;
  getSuggestionDiagnostics(fileName: string): Promise<DiagnosticWithLocation[]>;
  getCompilerOptionsDiagnostics(): Promise<Diagnostic[]>;
  getSyntacticClassifications(fileName: string, span: TextSpan): Promise<ClassifiedSpan[]>;
  getSemanticClassifications(fileName: string, span: TextSpan): Promise<ClassifiedSpan[]>;
  getEncodedSyntacticClassifications(fileName: string, span: TextSpan): Promise<Classifications>;
  getEncodedSemanticClassifications(fileName: string, span: TextSpan): Promise<Classifications>;
  getCompletionsAtPosition(
    fileName: string,
    position: number,
    options: GetCompletionsAtPositionOptions | undefined
  ): Promise<WithMetadata<CompletionInfo> | undefined>;
  getCompletionEntryDetails(
    fileName: string,
    position: number,
    name: string,
    formatOptions: FormatCodeOptions | FormatCodeSettings | undefined,
    source: string | undefined,
    preferences: UserPreferences | undefined
  ): Promise<CompletionEntryDetails | undefined>;
  getCompletionEntrySymbol(
    fileName: string,
    position: number,
    name: string,
    source: string | undefined
  ): Promise<Symbol | undefined>;
  getQuickInfoAtPosition(fileName: string, position: number): Promise<QuickInfo | undefined>;
  getNameOrDottedNameSpan(fileName: string, startPos: number, endPos: number): Promise<TextSpan | undefined>;
  getBreakpointStatementAtPosition(fileName: string, position: number): Promise<TextSpan | undefined>;
  getSignatureHelpItems(
    fileName: string,
    position: number,
    options: SignatureHelpItemsOptions | undefined
  ): Promise<SignatureHelpItems | undefined>;
  getRenameInfo(fileName: string, position: number, options?: RenameInfoOptions): Promise<RenameInfo>;
  findRenameLocations(
    fileName: string,
    position: number,
    findInStrings: boolean,
    findInComments: boolean,
    providePrefixAndSuffixTextForRename?: boolean
  ): Promise<ReadonlyArray<RenameLocation> | undefined>;
  getDefinitionAtPosition(fileName: string, position: number): Promise<ReadonlyArray<DefinitionInfo> | undefined>;
  getDefinitionAndBoundSpan(fileName: string, position: number): Promise<DefinitionInfoAndBoundSpan | undefined>;
  getTypeDefinitionAtPosition(fileName: string, position: number): Promise<ReadonlyArray<DefinitionInfo> | undefined>;
  getImplementationAtPosition(
    fileName: string,
    position: number
  ): Promise<ReadonlyArray<ImplementationLocation> | undefined>;
  getReferencesAtPosition(fileName: string, position: number): Promise<ReferenceEntry[] | undefined>;
  findReferences(fileName: string, position: number): Promise<ReferencedSymbol[] | undefined>;
  getDocumentHighlights(
    fileName: string,
    position: number,
    filesToSearch: string[]
  ): Promise<DocumentHighlights[] | undefined>;
  getOccurrencesAtPosition(fileName: string, position: number): Promise<ReadonlyArray<ReferenceEntry> | undefined>;
  getNavigateToItems(
    searchValue: string,
    maxResultCount?: number,
    fileName?: string,
    excludeDtsFiles?: boolean
  ): Promise<NavigateToItem[]>;
  getNavigationBarItems(fileName: string): Promise<NavigationBarItem[]>;
  getNavigationTree(fileName: string): Promise<NavigationTree>;
  getOutliningSpans(fileName: string): Promise<OutliningSpan[]>;
  getTodoComments(fileName: string, descriptors: TodoCommentDescriptor[]): Promise<TodoComment[]>;
  getBraceMatchingAtPosition(fileName: string, position: number): Promise<TextSpan[]>;
  getIndentationAtPosition(
    fileName: string,
    position: number,
    options: EditorOptions | EditorSettings
  ): Promise<number>;
  getFormattingEditsForRange(
    fileName: string,
    start: number,
    end: number,
    options: FormatCodeOptions | FormatCodeSettings
  ): Promise<TextChange[]>;
  getFormattingEditsForDocument(
    fileName: string,
    options: FormatCodeOptions | FormatCodeSettings
  ): Promise<TextChange[]>;
  getFormattingEditsAfterKeystroke(
    fileName: string,
    position: number,
    key: string,
    options: FormatCodeOptions | FormatCodeSettings
  ): Promise<TextChange[]>;
  getDocCommentTemplateAtPosition(fileName: string, position: number): Promise<TextInsertion | undefined>;
  isValidBraceCompletionAtPosition(fileName: string, position: number, openingBrace: number): Promise<boolean>;
  getJsxClosingTagAtPosition(fileName: string, position: number): Promise<JsxClosingTagInfo | undefined>;
  getSpanOfEnclosingComment(fileName: string, position: number, onlyMultiLine: boolean): Promise<TextSpan | undefined>;
  toLineColumnOffset?(fileName: string, position: number): Promise<LineAndCharacter>;
  getCodeFixesAtPosition(
    fileName: string,
    start: number,
    end: number,
    errorCodes: ReadonlyArray<number>,
    formatOptions: FormatCodeSettings,
    preferences: UserPreferences
  ): Promise<ReadonlyArray<CodeFixAction>>;
  getCombinedCodeFix(
    scope: CombinedCodeFixScope,
    fixId: {},
    formatOptions: FormatCodeSettings,
    preferences: UserPreferences
  ): Promise<CombinedCodeActions>;
  applyCodeActionCommand(
    action: CodeActionCommand,
    formatSettings?: FormatCodeSettings
  ): Promise<ApplyCodeActionCommandResult>;
  applyCodeActionCommand(
    action: CodeActionCommand[],
    formatSettings?: FormatCodeSettings
  ): Promise<ApplyCodeActionCommandResult[]>;
  applyCodeActionCommand(
    action: CodeActionCommand | CodeActionCommand[],
    formatSettings?: FormatCodeSettings
  ): Promise<ApplyCodeActionCommandResult | ApplyCodeActionCommandResult[]>;
  /** @deprecated `fileName` will be ignored */
  applyCodeActionCommand(fileName: string, action: CodeActionCommand): Promise<ApplyCodeActionCommandResult>;
  /** @deprecated `fileName` will be ignored */
  applyCodeActionCommand(fileName: string, action: CodeActionCommand[]): Promise<ApplyCodeActionCommandResult[]>;
  /** @deprecated `fileName` will be ignored */
  applyCodeActionCommand(
    fileName: string,
    action: CodeActionCommand | CodeActionCommand[]
  ): Promise<ApplyCodeActionCommandResult | ApplyCodeActionCommandResult[]>;
  getApplicableRefactors(
    fileName: string,
    positionOrRange: number | TextRange,
    preferences: UserPreferences | undefined
  ): Promise<ApplicableRefactorInfo[]>;
  getEditsForRefactor(
    fileName: string,
    formatOptions: FormatCodeSettings,
    positionOrRange: number | TextRange,
    refactorName: string,
    actionName: string,
    preferences: UserPreferences | undefined
  ): Promise<RefactorEditInfo | undefined>;
  organizeImports(
    scope: OrganizeImportsScope,
    formatOptions: FormatCodeSettings,
    preferences: UserPreferences | undefined
  ): Promise<ReadonlyArray<FileTextChanges>>;
  getEditsForFileRename(
    oldFilePath: string,
    newFilePath: string,
    formatOptions: FormatCodeSettings,
    preferences: UserPreferences | undefined
  ): Promise<ReadonlyArray<FileTextChanges>>;
  getEmitOutput(fileName: string, emitOnlyDtsFiles?: boolean): Promise<EmitOutput>;
  dispose(): Promise<void>;
}

export class MessageConnector {
  private _channel: Channel;

  constructor(private _socket: Socket, private _onError: (err: any) => any) {
    _socket.pipe(new JoinMessages()).on('data', onData);
    function onData(data: Buffer) {
      dispatchData(fromBuffer<SocketMessage>(data, SocketMessage));
    }
    const channel = (this._channel = new Channel());
    function dispatchData(value: SocketMessage) {
      if (value.type === MessageType.Response) {
        const id = +value.args.shift()!;
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

      if (value.type === MessageType.Error) {
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
      args.unshift(id);
      this._socket.write(
        toBuffer<SocketMessage>(
          {
            type: MessageType.Request,
            action,
            args
          },
          SocketMessage
        )
      );
    });
  }

  dispose() {
    this._socket.end();
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
