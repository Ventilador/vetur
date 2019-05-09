import {
  TextDocument,
  Diagnostic,
  Range,
  DiagnosticTag,
  DiagnosticSeverity,
  CompletionList,
  TextEdit,
  CompletionItemKind,
  CompletionItem,
  MarkupContent,
  MarkedString,
  Hover,
  ParameterInformation,
  SignatureInformation,
  SignatureHelp,
  DocumentHighlightKind,
  DocumentHighlight,
  SymbolInformation,
  SymbolKind,
  Definition,
  Location,
  FormattingOptions,
  CodeActionContext,
  Command
} from 'vscode-languageserver';
import { MessageConnector } from 'server/shared/classes';
import { Position } from 'server/shared/moves';
import { flattenDiagnosticMessageText, displayPartsToString, TextSpan } from 'typescript/lib/tsserverlibrary';
import { Socket } from 'net';
import { LanguageModelCache, getLanguageModelCache } from 'server/src/embeddedSupport/languageModelCache';
import { LanguageRange, getVueDocumentRegions, VueDocumentRegions } from 'server/src/embeddedSupport/embeddedSupport';
import Uri from 'vscode-uri';
import * as ts from 'typescript/lib/tsserverlibrary';
import { VLSFormatConfig } from 'server/src/config';
import { prettierify, prettierEslintify } from 'server/src/utils/prettier';
let supportedCodeFixCodes: Set<string | number | undefined>;
export function createService(): Handler {
  const documentRegions = getLanguageModelCache<VueDocumentRegions>(10, 60, document =>
    getVueDocumentRegions(document)
  );
  const firstScriptRegion = getLanguageModelCache(10, 60, document => {
    const vueDocument = documentRegions.get(document);
    const scriptRegions = vueDocument.getLanguageRangesOfType('script');
    return scriptRegions.length > 0 ? scriptRegions[0] : undefined;
  });
  return new Handler(null as any, firstScriptRegion);
}

export class Handler {
  public connector: MessageConnector;
  private config: any;
  constructor(_socket: Socket, private firstScriptRegion: any) {
    this.connector = new MessageConnector(_socket, console.error as any);
  }

  private ensureVersion(doc: TextDocument): Promise<TextDocument> {
    return this.connector.request<boolean>('checkVersion', [doc.uri, doc.version]).then(valid => {
      if (!valid) {
        this.updateFileInfo(doc);
      }
      return doc;
    });
  }
  configure(c: any) {
    this.config = c;
  }

  onDocumentRemoved(fileName: string): void {
    this.connector.write('delete', [fileName]);
  }

  dispose(): void {
    this.connector.dispose();
  }

  updateFileInfo(doc: TextDocument): void {
    this.connector.write('updateFile', [doc.uri, doc.version, doc.getText()]);
  }

  doValidation(doc: TextDocument): Promise<Diagnostic[]> {
    return this.ensureVersion(doc)
      .then(() => this.connector.request<ts.DiagnosticWithLocation[]>('getDiagnosticWithLocation', [doc.uri]))
      .then(fromTsToVsCodeDiagnostic(doc));
  }

  doComplete(doc: TextDocument, position: Position): Promise<CompletionList> {
    const offset = doc.offsetAt(position);
    return this.ensureVersion(doc)
      .then(() =>
        this.connector.request<ts.WithMetadata<ts.CompletionInfo>>('getCompletionsAtPosition', [doc.uri, offset])
      )
      .then(completions => {
        if (!completions) {
          return { isIncomplete: false, items: [] };
        }
        const entries = completions.entries.filter(entry => entry.name !== '__vueEditorBridge');
        return {
          isIncomplete: false,
          items: entries.map((entry, index) => {
            const range = entry.replacementSpan && convertRange(doc, entry.replacementSpan);
            return {
              uri: doc.uri,
              position,
              label: entry.name,
              sortText: entry.sortText + index,
              kind: convertKind(entry.kind),
              textEdit: range && TextEdit.replace(range, entry.name),
              data: {
                // data used for resolving item details (see 'doResolve')
                languageId: doc.languageId,
                uri: doc.uri,
                offset,
                source: entry.source
              }
            };
          })
        };
      });
  }
  doResolve(doc: TextDocument, item: CompletionItem): Promise<CompletionItem> {
    return this.ensureVersion(doc)
      .then(() =>
        this.connector.request<ts.CompletionEntryDetails | undefined>('getCompletionEntryDetails', [
          doc.uri,
          item.data.offset,
          item.label,
          item.data.source
        ])
      )
      .then(details => {
        if (details) {
          item.detail = displayPartsToString(details.displayParts);
          const documentation: MarkupContent = {
            kind: 'markdown',
            value: displayPartsToString(details.documentation)
          };
          if (details.codeActions && this.config.vetur.completion.autoImport) {
            const textEdits = convertCodeAction(doc, details.codeActions, this.firstScriptRegion);
            item.additionalTextEdits = textEdits;

            details.codeActions.forEach(action => {
              if (action.description) {
                documentation.value += '\n' + action.description;
              }
            });
          }
          item.documentation = documentation;
          delete item.data;
        }
        return item;
      });
  }
  doHover(doc: TextDocument, position: Position): Promise<Hover> {
    return this.ensureVersion(doc)
      .then(() =>
        this.connector.request<ts.QuickInfo | undefined>('getQuickInfoAtPosition', [doc.uri, doc.offsetAt(position)])
      )
      .then(info => {
        if (info) {
          const display = displayPartsToString(info.displayParts);
          const docParts = displayPartsToString(info.documentation);
          const markedContents: MarkedString[] = [{ language: 'ts', value: display }];
          if (docParts) {
            markedContents.unshift(docParts, '\n');
          }
          return {
            range: convertRange(doc, info.textSpan),
            contents: markedContents
          };
        }
        return { contents: [] };
      });
  }
  doSignatureHelp(doc: TextDocument, position: Position): Promise<SignatureHelp | null> {
    return this.ensureVersion(doc)
      .then(() =>
        this.connector.request<ts.SignatureHelpItems | undefined>('getSignatureHelpItems', [
          doc.uri,
          doc.offsetAt(position)
        ])
      )
      .then(signHelp => {
        if (!signHelp) {
          return null;
        }
        const ret: SignatureHelp = {
          activeSignature: signHelp.selectedItemIndex,
          activeParameter: signHelp.argumentIndex,
          signatures: []
        };
        signHelp.items.forEach(item => {
          const signature: SignatureInformation = {
            label: '',
            documentation: undefined,
            parameters: []
          };

          signature.label += displayPartsToString(item.prefixDisplayParts);
          item.parameters.forEach((p, i, a) => {
            const label = displayPartsToString(p.displayParts);
            const parameter: ParameterInformation = {
              label,
              documentation: displayPartsToString(p.documentation)
            };
            signature.label += label;
            signature.parameters!.push(parameter);
            if (i < a.length - 1) {
              signature.label += displayPartsToString(item.separatorDisplayParts);
            }
          });
          signature.label += displayPartsToString(item.suffixDisplayParts);
          ret.signatures.push(signature);
        });
        return ret;
      });
  }
  findDocumentHighlight(doc: TextDocument, position: Position): Promise<DocumentHighlight[]> {
    return this.ensureVersion(doc)
      .then(() =>
        this.connector.request<ts.ReferenceEntry[] | undefined>('getOccurrencesAtPosition', [
          doc.uri,
          doc.offsetAt(position)
        ])
      )
      .then(occurrences => {
        if (occurrences) {
          return occurrences.map(entry => {
            return {
              range: convertRange(doc, entry.textSpan),
              kind: entry.isWriteAccess ? DocumentHighlightKind.Write : DocumentHighlightKind.Text
            };
          });
        }
        return [];
      });
  }
  findDocumentSymbols(doc: TextDocument): Promise<SymbolInformation[]> {
    return this.ensureVersion(doc)
      .then(() => this.connector.request<ts.NavigationBarItem[]>('getNavigationBarItems', [doc.uri]))
      .then(items => {
        if (!items) {
          return [];
        }
        const result: SymbolInformation[] = [];
        const existing: { [k: string]: boolean } = {};
        const collectSymbols = (item: ts.NavigationBarItem, containerLabel?: string) => {
          const sig = item.text + item.kind + item.spans[0].start;
          if (item.kind !== 'script' && !existing[sig]) {
            const symbol: SymbolInformation = {
              name: item.text,
              kind: convertSymbolKind(item.kind),
              location: {
                uri: doc.uri,
                range: convertRange(doc, item.spans[0])
              },
              containerName: containerLabel
            };
            existing[sig] = true;
            result.push(symbol);
            containerLabel = item.text;
          }

          if (item.childItems && item.childItems.length > 0) {
            for (const child of item.childItems) {
              collectSymbols(child, containerLabel);
            }
          }
        };

        items.forEach(item => collectSymbols(item));
        return result;
      });
  }
  findDefinition(doc: TextDocument, position: Position): Promise<Definition> {
    return this.ensureVersion(doc)
      .then(() =>
        this.connector.request<{ fileName: string; textSpan: TextSpan }[]>('getDefinitionAtPosition', [
          doc.uri,
          doc.offsetAt(position)
        ])
      )
      .then(definitions => {
        return definitions.map(d => {
          return {
            uri: Uri.file(d.fileName).toString(),
            range: convertRange(doc, d.textSpan)
          };
        });
      });
  }
  findReferences(doc: TextDocument, position: Position): Promise<Location[]> {
    return this.ensureVersion(doc)
      .then(() =>
        this.connector.request<ts.ReferenceEntry[] | undefined>('getReferencesAtPosition', [
          doc.uri,
          doc.offsetAt(position)
        ])
      )
      .then(references => {
        if (!references) {
          return [];
        }

        return references.map(r => ({
          uri: Uri.file(r.fileName).toString(),
          range: convertRange(doc, r.textSpan)
        }));
      });
  }
  getCodeActions(doc: TextDocument, range: Range, _formatParams: FormattingOptions, context: CodeActionContext) {
    const start = doc.offsetAt(range.start);
    const end = doc.offsetAt(range.end);
    const fileName = doc.uri;
    if (!supportedCodeFixCodes) {
      supportedCodeFixCodes = new Set(ts.getSupportedCodeFixes());
    }
    const fixableDiagnosticCodes = context.diagnostics.map(d => d.code).filter(c => supportedCodeFixCodes.has(c));
    if (!fixableDiagnosticCodes) {
      return [];
    }

    const formatSettings: ts.FormatCodeSettings = getFormatCodeSettings(this.config);
    const textRange = { pos: start, end };
    return this.ensureVersion(doc)
      .then(() =>
        Promise.all([
          this.connector.request<ts.CodeFixAction[]>('getCodeFixesAtPosition', [
            fileName,
            start,
            end,
            formatSettings.tabSize,
            formatSettings.convertTabsToSpaces,
            formatSettings.indentSize,
            ...fixableDiagnosticCodes
          ]),
          this.connector.request<ts.ApplicableRefactorInfo[]>('getApplicableRefactors', [fileName, start, end])
        ])
      )
      .then(([fixes, refactorings]) => {
        const result: Command[] = [];
        collectQuickFixCommands(fixes, doc, result);
        collectRefactoringCommands(refactorings, fileName, formatSettings, textRange, result);
        return result;
      });
  }
  getRefactorEdits(doc: TextDocument, args: RefactorAction) {
    return this.ensureVersion(doc)
      .then(() =>
        this.connector.request<ts.RefactorEditInfo | undefined>('getEditsForRefactor', [JSON.stringify(args)])
      )
      .then(response => {
        if (!response) {
          // TODO: What happens when there's no response?
          return createApplyCodeActionCommand('', {});
        }
        const uriMapping = createUriMappingForEdits(response.edits, doc);
        return createApplyCodeActionCommand('', uriMapping);
      });
  }
  format(doc: TextDocument, range: Range, formatParams: FormattingOptions): Promise<TextEdit[]> | TextEdit[] {
    const defaultFormatter =
      doc.languageId === 'javascript'
        ? this.config.vetur.format.defaultFormatter.js
        : this.config.vetur.format.defaultFormatter.ts;

    if (defaultFormatter === 'none') {
      return [];
    }

    const parser = doc.languageId === 'javascript' ? 'babylon' : 'typescript';
    const needInitialIndent = this.config.vetur.format.scriptInitialIndent;
    const vlsFormatConfig: VLSFormatConfig = this.config.vetur.format;

    const filePath = doc.uri;
    if (defaultFormatter === 'prettier' || defaultFormatter === 'prettier-eslint') {
      const code = doc.getText(range);

      return defaultFormatter === 'prettier'
        ? prettierify(code, filePath, range, vlsFormatConfig, parser, needInitialIndent)
        : prettierEslintify(code, filePath, range, vlsFormatConfig, parser, needInitialIndent);
    } else {
      const initialIndentLevel = needInitialIndent ? 1 : 0;
      const formatSettings: ts.FormatCodeSettings =
        doc.languageId === 'javascript' ? this.config.javascript.format : this.config.typescript.format;
      const convertedFormatSettings = convertOptions(
        formatSettings,
        {
          tabSize: vlsFormatConfig.options.tabSize,
          insertSpaces: !vlsFormatConfig.options.useTabs
        },
        initialIndentLevel
      );

      const start = doc.offsetAt(range.start);
      const end = doc.offsetAt(range.end);
      return this.ensureVersion(doc)
        .then(() =>
          this.connector.request<ts.TextChange[]>('getFormattingEditsForRange', [
            filePath,
            start,
            end,
            JSON.stringify(convertedFormatSettings)
          ])
        )
        .then(edits => {
          if (!edits) {
            return [];
          }
          const result = [];
          for (const edit of edits) {
            if (edit.span.start >= start && edit.span.start + edit.span.length <= end) {
              result.push({
                range: convertRange(doc, edit.span),
                newText: edit.newText
              });
            }
          }
          return result;
        });
    }
  }
}

function collectQuickFixCommands(fixes: ReadonlyArray<ts.CodeFixAction>, doc: TextDocument, result: Command[]) {
  for (const fix of fixes) {
    const uriTextEditMapping = createUriMappingForEdits(fix.changes, doc);
    result.push(createApplyCodeActionCommand(fix.description, uriTextEditMapping));
  }
}

function createApplyCodeActionCommand(title: string, uriTextEditMapping: Record<string, TextEdit[]>): Command {
  return {
    title,
    command: 'vetur.applyWorkspaceEdits',
    arguments: [
      {
        changes: uriTextEditMapping
      }
    ]
  };
}

function createUriMappingForEdits(changes: ts.FileTextChanges[], doc: TextDocument) {
  const result: Record<string, TextEdit[]> = {};
  for (const { fileName, textChanges } of changes) {
    const edits = textChanges.map(({ newText, span }) => ({
      newText,
      range: convertRange(doc, span)
    }));
    const uri = Uri.file(fileName).toString();
    if (result[uri]) {
      result[uri].push(...edits);
    } else {
      result[uri] = edits;
    }
  }
  return result;
}

function fromTsToVsCodeDiagnostic(doc: TextDocument) {
  return function(response: ts.DiagnosticWithLocation[]) {
    return response.map(fromTsToVsCodeDiagEach, doc);
  };
}

function fromTsToVsCodeDiagEach(this: TextDocument, diag: ts.DiagnosticWithLocation) {
  const tags: DiagnosticTag[] = [];

  if (diag.reportsUnnecessary) {
    tags.push(DiagnosticTag.Unnecessary);
  }

  // syntactic/semantic diagnostic always has start and length
  // so we can safely cast diag to TextSpan
  return <Diagnostic>{
    range: convertRange(this, diag as ts.TextSpan),
    severity: DiagnosticSeverity.Error,
    message: flattenDiagnosticMessageText(diag.messageText, '\n'),
    tags,
    code: diag.code,
    source: 'Vetur'
  };
}

function convertRange(document: TextDocument, span: ts.TextSpan): Range {
  const startPosition = document.positionAt(span.start);
  const endPosition = document.positionAt(span.start + span.length);
  return Range.create(startPosition, endPosition);
}

function convertKind(kind: ts.ScriptElementKind): CompletionItemKind {
  switch (kind) {
    case 'primitive type':
    case 'keyword':
      return CompletionItemKind.Keyword;
    case 'var':
    case 'local var':
      return CompletionItemKind.Variable;
    case 'property':
    case 'getter':
    case 'setter':
      return CompletionItemKind.Field;
    case 'function':
    case 'method':
    case 'construct':
    case 'call':
    case 'index':
      return CompletionItemKind.Function;
    case 'enum':
      return CompletionItemKind.Enum;
    case 'module':
      return CompletionItemKind.Module;
    case 'class':
      return CompletionItemKind.Class;
    case 'interface':
      return CompletionItemKind.Interface;
    case 'warning':
      return CompletionItemKind.File;
  }

  return CompletionItemKind.Property;
}

function convertCodeAction(
  doc: TextDocument,
  codeActions: ts.CodeAction[],
  regionStart: LanguageModelCache<LanguageRange | undefined>
): TextEdit[] {
  const scriptStartOffset = doc.offsetAt(regionStart.get(doc)!.start);
  const textEdits: TextEdit[] = [];
  for (const action of codeActions) {
    for (const change of action.changes) {
      textEdits.push(
        ...change.textChanges.map(tc => {
          // currently, only import codeAction is available
          // change start of doc to start of script region
          if (tc.span.start <= scriptStartOffset && tc.span.length === 0) {
            const region = regionStart.get(doc);
            if (region) {
              const line = region.start.line;
              return {
                range: Range.create(line + 1, 0, line + 1, 0),
                newText: tc.newText
              };
            }
          }
          return {
            range: convertRange(doc, tc.span),
            newText: tc.newText
          };
        })
      );
    }
  }
  return textEdits;
}

function convertSymbolKind(kind: ts.ScriptElementKind): SymbolKind {
  switch (kind) {
    case 'var':
    case 'local var':
    case 'const':
      return SymbolKind.Variable;
    case 'function':
    case 'local function':
      return SymbolKind.Function;
    case 'enum':
      return SymbolKind.Enum;
    case 'module':
      return SymbolKind.Module;
    case 'class':
      return SymbolKind.Class;
    case 'interface':
      return SymbolKind.Interface;
    case 'method':
      return SymbolKind.Method;
    case 'property':
    case 'getter':
    case 'setter':
      return SymbolKind.Property;
  }
  return SymbolKind.Variable;
}

function getFormatCodeSettings(config: any): ts.FormatCodeSettings {
  return {
    tabSize: config.vetur.format.options.tabSize,
    indentSize: config.vetur.format.options.tabSize,
    convertTabsToSpaces: !config.vetur.format.options.useTabs
  };
}

function collectRefactoringCommands(
  refactorings: ts.ApplicableRefactorInfo[],
  fileName: string,
  formatSettings: any,
  textRange: { pos: number; end: number },
  result: Command[]
) {
  const actions: RefactorAction[] = [];
  for (const refactoring of refactorings) {
    const refactorName = refactoring.name;
    if (refactoring.inlineable) {
      actions.push({
        fileName,
        formatOptions: formatSettings,
        textRange,
        refactorName,
        actionName: refactorName,
        preferences: {},
        description: refactoring.description
      });
    } else {
      actions.push(
        ...refactoring.actions.map(action => ({
          fileName,
          formatOptions: formatSettings,
          textRange,
          refactorName,
          actionName: action.name,
          preferences: {},
          description: action.description
        }))
      );
    }
  }
  for (const action of actions) {
    result.push({
      command: 'vetur.chooseTypeScriptRefactoring',
      title: action.description,
      arguments: [action]
    });
  }
}

function convertOptions(
  formatSettings: ts.FormatCodeSettings,
  options: FormattingOptions,
  initialIndentLevel: number
): ts.FormatCodeSettings {
  return Object.assign(formatSettings, {
    convertTabsToSpaces: options.insertSpaces,
    tabSize: options.tabSize,
    indentSize: options.tabSize,
    baseIndentSize: options.tabSize * initialIndentLevel
  });
}
