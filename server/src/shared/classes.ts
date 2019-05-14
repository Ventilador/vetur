import { Socket } from 'net';
import { fromBuffer, toBuffer } from './parser';
import { JoinMessages } from './joinMessages';
import { SocketMessage, MessageType } from './serialization/socketMessage';
import { Diagnostic, TextEdit } from 'vscode-languageserver-types';
import { Method, IMetadataItem, Argument } from './decorators/reviver';
import { FullJson } from './serialization/json';
import { TextDocument, CompletionList, CompletionItem, Hover, SignatureHelp, DocumentHighlight, SymbolInformation, Definition, Location, CodeActionContext, Command, Range, FormattingOptions, Position } from 'vscode-languageserver';
import { Doc, DocWithText } from './serialization/document';
import { RefactorAction } from '../server/types';
import { Thru } from './serialization/thru';
import { ArrayOf } from './serialization/arrayOf';


export abstract class AsyncLanguageService {
  public static METADATA: IMetadataItem[] = [];
  public bus$: MessageConnector;
  constructor(socket: Socket, onError: (err: any) => any) {
    this.bus$ = new MessageConnector(socket, onError);
    AsyncLanguageService.METADATA.forEach((m: IMetadataItem) => {
      (this as any)[m.name] = this.initWrapper(m);
    });
  }
  public abstract dispose(): void;
  protected abstract initWrapper(metadata: IMetadataItem): Function;


  @Method() updateDocument(
    @Argument(DocWithText) doc: TextDocument
  ): Promise<void> | void {
    throw new Error('Not implemented');
  }
  @Method() configure(
    @Argument(FullJson) c: any
  ): Promise<void> | void {
    throw new Error('Not implemented');
  }
  @Method() updateFileInfo(
    @Argument(Doc) doc: TextDocument
  ): Promise<void> | void {
    throw new Error('Not implemented');
  }
  @Method(ArrayOf(FullJson)) doValidation(
    @Argument(Doc) doc: TextDocument
  ): Promise<Diagnostic[]> | Diagnostic[] {
    throw new Error('Not implemented');
  }
  @Method(FullJson) doComplete(
    @Argument(Doc) doc: TextDocument,
    @Argument(FullJson) position: Position
  ): Promise<CompletionList> | CompletionList {
    throw new Error('Not implemented');
  }
  @Method(FullJson) doResolve(
    @Argument(Doc) doc: TextDocument,
    @Argument(FullJson) item: CompletionItem
  ): Promise<CompletionItem> | CompletionItem {
    throw new Error('Not implemented');
  }
  @Method(FullJson) doHover(
    @Argument(Doc) doc: TextDocument,
    @Argument(FullJson) position: Position
  ): Promise<Hover> | Hover {
    throw new Error('Not implemented');
  }
  @Method(FullJson) doSignatureHelp(
    @Argument(Doc) doc: TextDocument,
    @Argument(FullJson) position: Position
  ): Promise<SignatureHelp | null> | SignatureHelp | null {
    throw new Error('Not implemented');
  }
  @Method(FullJson) findDocumentHighlight(
    @Argument(Doc) doc: TextDocument,
    @Argument(FullJson) position: Position
  ): Promise<DocumentHighlight[]> | DocumentHighlight[] {
    throw new Error('Not implemented');
  }
  @Method(ArrayOf(FullJson)) findDocumentSymbols(
    @Argument(Doc) doc: TextDocument
  ): Promise<SymbolInformation[]> | SymbolInformation[] {
    throw new Error('Not implemented');
  }
  @Method(FullJson) findDefinition(
    @Argument(Doc) doc: TextDocument,
    @Argument(FullJson) position: Position
  ): Promise<Definition> | Definition {
    throw new Error('Not implemented');
  }
  @Method(FullJson) findReferences(
    @Argument(Doc) doc: TextDocument,
    @Argument(FullJson) position: Position
  ): Promise<Location[]> | Location[] {
    throw new Error('Not implemented');
  }
  @Method(ArrayOf(FullJson)) getCodeActions(
    @Argument(Doc) doc: TextDocument,
    @Argument(FullJson) range: Range,
    @Argument(FullJson) formatParams: FormattingOptions,
    @Argument(FullJson) context: CodeActionContext
  ): Promise<Command[]> | Command[] {
    throw new Error('Not implemented');
  }
  @Method(FullJson) getRefactorEdits(
    @Argument(Doc) doc: TextDocument,
    @Argument(FullJson) args: RefactorAction
  ): Promise<Command> | Command {
    throw new Error('Not implemented');
  }
  @Method(ArrayOf(FullJson)) format(
    @Argument(Doc) doc: TextDocument,
    @Argument(FullJson) range: Range,
    @Argument(FullJson) formatParams: FormattingOptions
  ): Promise<TextEdit[]> | TextEdit[] {
    throw new Error('Not implemented');
  }
  @Method() onDocumentRemoved(@Argument(Doc) doc: TextDocument): Promise<void> | void {
    throw new Error('Not implemented');
  }
  @Method() onDocumentChanged(@Argument(Thru) filePath: string): Promise<void> | void {
    throw new Error('Not implemented');
  }
}


export class MessageConnector {
  private _channel: Channel;
  private events: Record<string, Function> = Object.create(null);
  constructor(private _socket: Socket, private _onError: (err: any) => any) {
    _socket.pipe(new JoinMessages()).on('data', onData);
    function onData(data: Buffer) {
      dispatchData(fromBuffer<SocketMessage>(data, SocketMessage));
    }
    const channel = (this._channel = new Channel());
    const events = this.events;
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

      if (value.type === MessageType.Request) {
        handleRequest(value);
      }
    }

    function handleRequest(value: SocketMessage) {
      if (events[value.action]) {
        events[value.action].apply(null, value.args)
          .then((result: any) => {
            _socket.write(toBuffer<SocketMessage>(
              {
                type: MessageType.Response,
                action: value.action,
                args: [null, result],
                id: value.id
              },
              SocketMessage
            ))
          }, (result: any) => _socket.write(toBuffer<SocketMessage>(
            {
              type: MessageType.Response,
              action: value.action,
              args: [result, null],
              id: value.id
            },
            SocketMessage
          ))
          );
      }
    }
  }

  request<T>(
    action: string, args: any[] = []
  ): Promise<T> {
    return new Promise((res, rej) => {
      const id = this._channel.put((err, result) => {
        if (err) {
          rej(err);
        } else {
          res(result);
        }
      });
      this._socket.write(
        toBuffer<SocketMessage>(
          {
            type: MessageType.Request,
            action,
            args,
            id
          },
          SocketMessage
        )
      );
    });
  }

  onRequest(name: string, fn: Function) {
    this.events[name] = function () {
      try {
        const result = fn.apply(null, arguments);
        if (result && result.then) {
          return result;
        } else {
          return Promise.resolve(result);
        }
      } catch (err) {
        Promise.reject(err);
      }
    }
  }

  dispose() {
    this._socket.end();
  }

  private handleRequest() {

  }
}

class Channel {
  private channels: Record<number, Function | undefined> = Object.create(null);
  private available: number[] = [];
  private len = 0;
  put(cb: (err: Error, result?: any) => any) {
    const id = this.available.length ? this.available.pop()! : this.len++;
    const self = this;
    this.channels[id] = function () {
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
