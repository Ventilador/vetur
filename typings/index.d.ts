export {};
import {
  CompletionItem,
  Location,
  SignatureHelp,
  Definition,
  TextEdit,
  TextDocument,
  Diagnostic,
  DocumentLink,
  Range,
  Hover,
  DocumentHighlight,
  CompletionList,
  Position,
  FormattingOptions,
  SymbolInformation,
  CodeActionContext,
  ColorInformation,
  Color,
  ColorPresentation,
  Command
} from 'vscode-languageserver-types';
import { DiagnosticWithLocation } from 'typescript/lib/tsserverlibrary';
import { HandlerResult } from 'vscode-jsonrpc';
declare global {
  type Moveable = string | boolean | number | IMove;
  type Move = Moveable | Moveable[];
  interface IMove {
    toMoved(): Move;
  }
  interface ServerConnection {
    configure?(options: any): void;
    updateFileInfo?(doc: TextDocument): void;

    doValidation?(documentName: string): DiagnosticWithLocation[];
    getCodeActions?(
      documentName: string,
      range: Range,
      formatParams: FormattingOptions,
      context: CodeActionContext
    ): HandlerResult<Command[], any>;
    getRefactorEdits?(doc: TextDocument, args: RefactorAction): HandlerResult<Command | undefined, any>;
    doComplete?(document: TextDocument, position: Position): HandlerResult<CompletionList, any>;
    doResolve?(document: TextDocument, item: CompletionItem): HandlerResult<CompletionItem, any>;
    doHover?(document: TextDocument, position: Position): HandlerResult<Hover, any>;
    doSignatureHelp?(document: TextDocument, position: Position): HandlerResult<SignatureHelp | null, any>;
    findDocumentHighlight?(document: TextDocument, position: Position): HandlerResult<DocumentHighlight[], any>;
    findDocumentSymbols?(document: TextDocument): Promise<SymbolInformation[]> | SymbolInformation[];
    findDocumentLinks?(
      document: TextDocument,
      documentContext: DocumentContext
    ): Promise<DocumentLink[]> | DocumentLink[];
    findDefinition?(document: TextDocument, position: Position): HandlerResult<Definition, any>;
    findReferences?(document: TextDocument, position: Position): HandlerResult<Location[], any>;
    format?(document: TextDocument, range: Range, options: FormattingOptions): TextEdit[];
    findDocumentColors?(document: TextDocument): Promise<ColorInformation[]> | ColorInformation[];
    getColorPresentations?(document: TextDocument, color: Color, range: Range): HandlerResult<ColorPresentation[], any>;

    onDocumentChanged?(filePath: string): void;
    onDocumentRemoved(document: string): void;
    dispose(): void;
  }
  interface DocumentContext {
    resolveReference(ref: string, base?: string): string;
  }

  interface RefactorAction {
    fileName: string;
    formatOptions: any;
    textRange: {
      pos: number;
      end: number;
    };
    refactorName: string;
    actionName: string;
    preferences: {};
    description: string;
  }
}
