import {
    TextDocument,
} from 'vscode-languageserver-types';


import { DocumentService } from '../../services/documentService';
import { AsyncLanguageService } from '../../../shared/classes';
import { createConnection } from 'net';
import { IMetadataItem, argWrapper } from '../../../shared/decorators/reviver';

// Todo: After upgrading to LS server 4.0, use CompletionContext for filtering trigger chars
// https://microsoft.github.io/language-server-protocol/specification#completion-request-leftwards_arrow_with_hook

export function getJavascriptMode(docService: DocumentService): JsLangService {
    return new JsLangService();
}

class JsLangService extends AsyncLanguageService {
    constructor() {
        super(createConnection({
            port: 0,
            host: 'localhost'
        }), console.error);
    }
    public getId(){
        return 'typescript';
    }
    public dispose(): void {
        this.bus$.dispose();
    }

    public updateFile(doc: TextDocument) {
        return this.bus$.request('updateFile', [this.textDocToBuff(doc)])
    }

    protected initWrapper(metadata: IMetadataItem): Function {
        return argWrapper(metadata.transforms, this.bus$.request.bind(this.bus$, metadata.name), 'stringify');
    }

    private textDocToBuff(doc: TextDocument): string {
        return '';
    }
}
