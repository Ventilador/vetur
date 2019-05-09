import { Socket } from 'net';
import { MessageConnector } from 'server/shared/classes';
import { TextDocument } from 'vscode-languageserver';
import { TextSpan } from 'typescript/lib/tsserverlibrary';
import { F64 } from 'server/shared/serialization/f64';
import { ArrayOf } from 'server/shared/serialization/arrayOf';
import { ToMove } from 'server/shared/decorators/reviver';
import { Thru } from 'server/shared/serialization/thru';
import { FullJson } from 'server/shared/serialization/json';
import { Doc } from 'server/shared/serialization/document';

export function createLanguageService(socket: Socket, onError: (err: any) => any) {
  const bus = new MessageConnector(socket, onError);

  return new AsyncLanguageService();
}
class AsyncLanguageService {
  bus: MessageConnector;
  constructor(socket: Socket, onError: (err: any) => any) {
    this.bus = new MessageConnector(socket, onError);
  }
  dispose(): void {
    this.bus.dispose();
  }
  updateFile(@ToMove(Doc) doc: TextDocument): void {
    this.bus.write('updateFile', [doc]);
  }

  getDiagnosticWithLocation(@ToMove(Thru) fileName: string): Promise<ts.DiagnosticWithLocation[]> {
    return this.bus.request<ts.DiagnosticWithLocation[]>('getDiagnosticWithLocation', [fileName]);
  }

  onDocumentRemoved(@ToMove(Thru) fileName: string): void {
    this.bus.write('delete', [fileName]);
  }

  getCompletionsAtPosition(
    @ToMove(Thru) fileName: string,
    @ToMove(F64) offset: number
  ): Promise<ts.WithMetadata<ts.CompletionInfo>> {
    return this.bus.request<ts.WithMetadata<ts.CompletionInfo>>('getCompletionsAtPosition', [fileName, offset]);
  }

  getCompletionEntryDetails(
    @ToMove(Thru) fileName: string,
    @ToMove(F64) offset: number,
    @ToMove(Thru) label: string,
    @ToMove(Thru) source: string
  ): Promise<ts.CompletionEntryDetails | undefined> {
    return this.bus.request<ts.CompletionEntryDetails | undefined>('getCompletionEntryDetails', [
      fileName,
      offset,
      label,
      source
    ]);
  }

  getQuickInfoAtPosition(
    @ToMove(Thru) fileName: string,
    @ToMove(F64) offset: number
  ): Promise<ts.QuickInfo | undefined> {
    return this.bus.request<ts.QuickInfo | undefined>('getQuickInfoAtPosition', [fileName, offset]);
  }

  getSignatureHelpItems(
    @ToMove(Thru) fileName: string,
    @ToMove(F64) offset: number
  ): Promise<ts.SignatureHelpItems | undefined> {
    return this.bus.request<ts.SignatureHelpItems | undefined>('getSignatureHelpItems', [fileName, offset]);
  }

  getOccurrencesAtPosition(
    @ToMove(Thru) fileName: string,
    @ToMove(F64) offset: number
  ): Promise<ts.ReferenceEntry[] | undefined> {
    return this.bus.request<ts.ReferenceEntry[] | undefined>('getOccurrencesAtPosition', [fileName, offset]);
  }

  getNavigationBarItems(@ToMove(Thru) fileName: string): Promise<ts.NavigationBarItem[]> {
    return this.bus.request<ts.NavigationBarItem[]>('getNavigationBarItems', [fileName, offset]);
  }

  getDefinitionAtPosition(
    @ToMove(Thru) fileName: string,
    @ToMove(F64) offset: number
  ): Promise<{ fileName: string; textSpan: TextSpan }[]> {
    return this.bus.request<{ fileName: string; textSpan: TextSpan }[]>('getDefinitionAtPosition', [fileName, offset]);
  }
  getReferencesAtPosition(
    @ToMove(Thru) fileName: string,
    @ToMove(F64) offset: number
  ): Promise<ts.ReferenceEntry[] | undefined> {
    return this.bus.request<ts.ReferenceEntry[] | undefined>('getReferencesAtPosition', [fileName, offset]);
  }
  getCodeFixesAtPosition(
    @ToMove(Thru) fileName: string,
    @ToMove(F64) start: number,
    @ToMove(F64) end: number,
    @ToMove(F64) tabSize: number,
    @ToMove(F64) convertTabsToSpaces: boolean,
    @ToMove(F64) indentSize: number,
    @ToMove(ArrayOf(F64)) fixableDiagnosticCodes: number[]
  ): Promise<ts.CodeFixAction[]> {
    return this.bus.request<ts.CodeFixAction[]>('getCodeFixesAtPosition', [
      fileName,
      start,
      end,
      tabSize,
      convertTabsToSpaces,
      indentSize,
      fixableDiagnosticCodes
    ]);
  }
  getApplicableRefactors(
    @ToMove(Thru) fileName: string,
    @ToMove(F64) pos: number,
    @ToMove(F64) end: number
  ): Promise<ts.ApplicableRefactorInfo[]> {
    return this.bus.request<ts.ApplicableRefactorInfo[]>('getReferencesAtPosition', [fileName, pos, end]);
  }
  getEditsForRefactor(@ToMove(FullJson) args: any): Promise<ts.RefactorEditInfo | undefined> {
    return this.bus.request<ts.RefactorEditInfo | undefined>('getReferencesAtPosition', [args]);
  }
  getFormattingEditsForRange(
    @ToMove(Thru) fileName: string,
    @ToMove(F64) start: number,
    @ToMove(F64) end: number,
    @ToMove(FullJson) convertedFormatSettings: ts.FormatCodeOptions | ts.FormatCodeSettings
  ): Promise<ts.TextChange[]> {
    return this.bus.request<ts.TextChange[]>('getReferencesAtPosition', [
      fileName,
      start,
      end,
      convertedFormatSettings
    ]);
  }
}
