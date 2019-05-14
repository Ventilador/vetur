import { Socket } from 'net';
import { MessageConnector, AsyncLanguageService } from '../shared/classes';
import { displayPartsToString, flattenDiagnosticMessageText, getSupportedCodeFixes, server, ScriptKind } from 'typescript/lib/tsserverlibrary';
import { ServerHost } from './serverHost';
import {
  TextDocument, Diagnostic, DiagnosticTag, Range, DiagnosticSeverity,
  Position, CompletionList, TextEdit, CompletionItemKind, CompletionItem,
  MarkupContent, Hover, MarkedString, SignatureHelp, SignatureInformation,
  ParameterInformation, DocumentHighlight, DocumentHighlightKind, SymbolInformation,
  Definition, Location, FormattingOptions, CodeActionContext, Command, SymbolKind
} from 'vscode-languageserver';
import { Uri } from 'vscode';
import { IMetadataItem, argWrapper } from '../shared/decorators/reviver';
import { getFileFsPath } from '../server/utils/paths';
import { LanguageModelCache } from '../server/embeddedSupport/languageModelCache';
import { LanguageRange } from '../server/embeddedSupport/embeddedSupport';
import { NULL_SIGNATURE } from '../server/modes/nullMode';
import { RefactorAction } from '../server/types';
import { VLSFormatConfig } from '../server/config';
import { prettierify, prettierEslintify } from '../server/utils/prettier';


let supportedCodeFixCodes: Set<any> | undefined;
// Todo: After upgrading to LS server 4.0, use CompletionContext for filtering trigger chars
// https://microsoft.github.io/language-server-protocol/specification#completion-request-leftwards_arrow_with_hook
const NON_SCRIPT_TRIGGERS = ['<', '/', '*', ':'];
export class Handler extends AsyncLanguageService {
  private config: any;

  constructor(
    _socket: Socket,
    private _languageService: ts.LanguageService,
    private _firstScriptRegion: LanguageModelCache<LanguageRange | undefined>,
    private _project: ts.server.Project,
    private _host: ServerHost
  ) {
    super(_socket, console.error);
    AsyncLanguageService.METADATA.forEach((m) => {
      this.bus$.onRequest(m.name, (this as any)[m.name]);
    })
  }

  public dispose(): void {
    this.bus$.dispose();
  }
  protected initWrapper(metadata: IMetadataItem): Function {
    const self = this;
    const method = (this as any)[metadata.name] as Function;
    return argWrapper(metadata.transforms, function () {
      return metadata.returns.stringify(method.apply(self, arguments));
    }, 'parse');
  }

  public updateDocument(file: TextDocument) {
    const path = server.toNormalizedPath(file.uri);

    this._host.updateFile(path, file.getText());

    let info = this._project.getScriptInfo(path);
    if (!info) {
      info = new server.ScriptInfo(this._host, path, ScriptKind.TS, true, path as any);
      this._project.addRoot(info);
    }
    info.reloadFromFile(path);
  }

  public configure(c: any) {
    this.config = c;
  }
  public updateFileInfo(): void { }
  public doValidation(doc: TextDocument): Diagnostic[] {
    if (!shouldProcess(doc.uri)) {
      return [];
    }

    const fileFsPath = getFileFsPath(doc.uri);
    const rawScriptDiagnostics = [
      ...this._languageService.getSyntacticDiagnostics(fileFsPath),
      ...this._languageService.getSemanticDiagnostics(fileFsPath)
    ];

    return rawScriptDiagnostics.map(diag => {
      const tags: DiagnosticTag[] = [];

      if (diag.reportsUnnecessary) {
        tags.push(DiagnosticTag.Unnecessary);
      }

      // syntactic/semantic diagnostic always has start and length
      // so we can safely cast diag to TextSpan
      return <Diagnostic>{
        range: convertRange(doc, diag as ts.TextSpan),
        severity: DiagnosticSeverity.Error,
        message: flattenDiagnosticMessageText(diag.messageText, '\n'),
        tags,
        code: diag.code,
        source: 'Vetur'
      };
    });
  }
  doComplete(doc: TextDocument, position: Position): CompletionList {
    if (!shouldProcess(doc.uri)) {
      return { isIncomplete: false, items: [] };
    }

    const fileFsPath = getFileFsPath(doc.uri);
    const offset = doc.offsetAt(position);
    const triggerChar = doc.getText()[offset - 1];
    if (NON_SCRIPT_TRIGGERS.includes(triggerChar)) {
      return { isIncomplete: false, items: [] };
    }
    const completions = this._languageService.getCompletionsAtPosition(fileFsPath, offset, {
      includeCompletionsWithInsertText: true,
      includeCompletionsForModuleExports: !!(
        this.config &&
        this.config.vetur &&
        this.config.vetur.completion &&
        this.config.vetur.completion.autoImport
      )
    });
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
  }
  doResolve(doc: TextDocument, item: CompletionItem): CompletionItem {
    if (!shouldProcess(doc.uri)) {
      return item;
    }

    const fileFsPath = getFileFsPath(doc.uri);
    const details = this._languageService.getCompletionEntryDetails(
      fileFsPath,
      item.data.offset,
      item.label,
      getFormatCodeSettings(this.config),
      item.data.source,
      {
        importModuleSpecifierEnding: 'minimal',
        importModuleSpecifierPreference: 'relative',
        includeCompletionsWithInsertText: true
      }
    );
    if (details) {
      item.detail = displayPartsToString(details.displayParts);
      const documentation: MarkupContent = {
        kind: 'markdown',
        value: displayPartsToString(details.documentation)
      };
      if (details.codeActions && this.config.vetur.completion.autoImport) {
        const textEdits = convertCodeAction(doc, details.codeActions, this._firstScriptRegion);
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
  }
  doHover(textDoc: TextDocument, position: Position): Hover {
    if (!shouldProcess(textDoc.uri)) {
      return { contents: [] };
    }

    const fileFsPath = getFileFsPath(textDoc.uri);
    const info = this._languageService.getQuickInfoAtPosition(fileFsPath, textDoc.offsetAt(position));
    if (info) {
      const display = displayPartsToString(info.displayParts);
      const doc = displayPartsToString(info.documentation);
      const markedContents: MarkedString[] = [{ language: 'ts', value: display }];
      if (doc) {
        markedContents.unshift(doc, '\n');
      }
      return {
        range: convertRange(textDoc, info.textSpan),
        contents: markedContents
      };
    }
    return { contents: [] };
  }
  doSignatureHelp(doc: TextDocument, position: Position): SignatureHelp | null {
    if (!shouldProcess(doc.uri)) {
      return NULL_SIGNATURE;
    }

    const fileFsPath = getFileFsPath(doc.uri);
    const signHelp = this._languageService.getSignatureHelpItems(fileFsPath, doc.offsetAt(position), undefined);
    if (!signHelp) {
      return NULL_SIGNATURE;
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
  }
  findDocumentHighlight(doc: TextDocument, position: Position): DocumentHighlight[] {
    if (!shouldProcess(doc.uri)) {
      return [];
    }

    const fileFsPath = getFileFsPath(doc.uri);
    const occurrences = this._languageService.getOccurrencesAtPosition(fileFsPath, doc.offsetAt(position));
    if (occurrences) {
      return occurrences.map(entry => {
        return {
          range: convertRange(doc, entry.textSpan),
          kind: entry.isWriteAccess ? DocumentHighlightKind.Write : DocumentHighlightKind.Text
        };
      });
    }
    return [];
  }
  findDocumentSymbols(doc: TextDocument): SymbolInformation[] {
    if (!shouldProcess(doc.uri)) {
      return [];
    }

    const fileFsPath = getFileFsPath(doc.uri);
    const items = this._languageService.getNavigationBarItems(fileFsPath);
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
  }
  findDefinition(doc: TextDocument, position: Position): Definition {
    if (!shouldProcess(doc.uri)) {
      return [];
    }

    const fileFsPath = getFileFsPath(doc.uri);
    const definitions = this._languageService.getDefinitionAtPosition(fileFsPath, doc.offsetAt(position));
    if (!definitions) {
      return [];
    }

    const definitionResults: Definition = [];
    const program = this._languageService.getProgram();
    if (!program) {
      return [];
    }
    definitions.forEach(d => {
      const definitionTargetDoc = getSourceDoc(d.fileName, program);
      definitionResults.push({
        uri: Uri.file(d.fileName).toString(),
        range: convertRange(definitionTargetDoc, d.textSpan)
      });
    });
    return definitionResults;
  }
  findReferences(doc: TextDocument, position: Position): Location[] {
    if (!shouldProcess(doc.uri)) {
      return [];
    }

    const fileFsPath = getFileFsPath(doc.uri);
    const references = this._languageService.getReferencesAtPosition(fileFsPath, doc.offsetAt(position));
    if (!references) {
      return [];
    }

    const referenceResults: Location[] = [];
    const program = this._languageService.getProgram();
    if (!program) {
      return [];
    }
    references.forEach(r => {
      const referenceTargetDoc = getSourceDoc(r.fileName, program);
      if (referenceTargetDoc) {
        referenceResults.push({
          uri: Uri.file(r.fileName).toString(),
          range: convertRange(referenceTargetDoc, r.textSpan)
        });
      }
    });
    return referenceResults;
  }
  getCodeActions(doc: TextDocument, range: Range, _formatParams: FormattingOptions, context: CodeActionContext) {
    const fileName = getFileFsPath(doc.uri);
    const start = doc.offsetAt(range.start);
    const end = doc.offsetAt(range.end);
    if (!supportedCodeFixCodes) {
      supportedCodeFixCodes = new Set(
        getSupportedCodeFixes()
          .map(Number)
          .filter(x => !isNaN(x))
      );
    }
    const fixableDiagnosticCodes = context.diagnostics.map(d => +d.code!).filter(c => supportedCodeFixCodes!.has(c));
    if (!fixableDiagnosticCodes) {
      return [];
    }

    const formatSettings: ts.FormatCodeSettings = getFormatCodeSettings(this.config);

    const result: Command[] = [];
    const fixes = this._languageService.getCodeFixesAtPosition(
      fileName,
      start,
      end,
      fixableDiagnosticCodes,
      formatSettings,
      /*preferences*/ {}
    );
    collectQuickFixCommands(fixes, this._languageService, result);

    const textRange = { pos: start, end };
    const refactorings = this._languageService.getApplicableRefactors(fileName, textRange, /*preferences*/ {});
    collectRefactoringCommands(refactorings, fileName, formatSettings, textRange, result);

    return result;
  }
  getRefactorEdits(doc: TextDocument, args: RefactorAction) {
    const response = this._languageService.getEditsForRefactor(
      args.fileName,
      args.formatOptions,
      args.textRange,
      args.refactorName,
      args.actionName,
      args.preferences
    );
    if (!response) {
      // TODO: What happens when there's no response?
      return createApplyCodeActionCommand('', {});
    }
    const uriMapping = createUriMappingForEdits(response.edits, this._languageService);
    return createApplyCodeActionCommand('', uriMapping);
  }
  format(doc: TextDocument, range: Range, formatParams: FormattingOptions): TextEdit[] {

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

    if (defaultFormatter === 'prettier' || defaultFormatter === 'prettier-eslint') {
      const code = doc.getText(range);
      const filePath = getFileFsPath(doc.uri);

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

      const fileFsPath = getFileFsPath(doc.uri);
      const start = doc.offsetAt(range.start);
      const end = doc.offsetAt(range.end);
      const edits = this._languageService.getFormattingEditsForRange(fileFsPath, start, end, convertedFormatSettings);

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
    }
  }
  onDocumentRemoved(_document: TextDocument) { }
  onDocumentChanged(_filePath: string) { }
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


function getFormatCodeSettings(config: any): ts.FormatCodeSettings {
  return {
    tabSize: config.vetur.format.options.tabSize,
    indentSize: config.vetur.format.options.tabSize,
    convertTabsToSpaces: !config.vetur.format.options.useTabs
  };
}

function convertRange(document: TextDocument, span: ts.TextSpan): Range {
  const startPosition = document.positionAt(span.start);
  const endPosition = document.positionAt(span.start + span.length);
  return Range.create(startPosition, endPosition);
}

function shouldProcess(fileName: string) {
  return fileName.endsWith('vue');
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

function getSourceDoc(fileName: string, program: ts.Program): TextDocument {
  const sourceFile = program.getSourceFile(fileName)!;
  return TextDocument.create(fileName, 'vue', 0, sourceFile.getFullText());
}



function createUriMappingForEdits(changes: ts.FileTextChanges[], service: ts.LanguageService) {
  const program = service.getProgram()!;
  const result: Record<string, TextEdit[]> = {};
  for (const { fileName, textChanges } of changes) {
    const targetDoc = getSourceDoc(fileName, program);
    const edits = textChanges.map(({ newText, span }) => ({
      newText,
      range: convertRange(targetDoc, span)
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
function collectQuickFixCommands(
  fixes: ReadonlyArray<ts.CodeFixAction>,
  service: ts.LanguageService,
  result: Command[]
) {
  for (const fix of fixes) {
    const uriTextEditMapping = createUriMappingForEdits(fix.changes, service);
    result.push(createApplyCodeActionCommand(fix.description, uriTextEditMapping));
  }
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