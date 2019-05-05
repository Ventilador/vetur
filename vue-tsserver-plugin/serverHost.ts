import * as ts_module from 'typescript/lib/tsserverlibrary';
export function createServerHost(original: ts.server.ServerHost, project: ts.server.Project) {
  const ctor = function() {} as any;
  const cache = Object.create(null) as Record<string, CacheItem>;
  ctor.prototype = original;
  class ServerHostClass extends ctor {
    updateFile(fileName: string, fileContent: string) {
      safeCache(fileName, fileContent).version++;
    }
    readFile(fileName: string, encoding?: string | undefined) {
      if (cache[fileName]) {
        return cache[fileName].content;
      }

      return safeCache(fileName, this._loadFile(fileName, encoding)).content;
    }
    getFileSize(path: string): number {
      if (cache[path]) {
        return cache[path].content.length;
      }

      return super.getFileSize(path);
    }

    writeFile(fileName: string) {
      throw new Error(`Cannot save file "${fileName}", from extension`);
    }

    private _loadFile(fileName: string, encoding: string | undefined) {
      const snapshot = project.getScriptSnapshot(fileName);
      if (snapshot) {
        return snapshot.getText(0, snapshot.getLength());
      }

      return super.readFile(fileName, encoding);
    }
  }
  interface ServerHostClass extends ServerHost {}
  return new ServerHostClass() as ServerHost;

  function loadFile(fileName: string) {}

  function safeCache(fileName: string, fileContent: string): CacheItem {
    return (
      cache[fileName] ||
      (cache[fileName] = {
        path: fileName,
        version: 0,
        content: fileContent
      })
    );
  }
}

interface CacheItem {
  path: string;
  version: number;
  content: string;
}
export interface ServerHost extends ts.server.ServerHost {
  updateFile(fileName: string, fileContent: string): void;
}
