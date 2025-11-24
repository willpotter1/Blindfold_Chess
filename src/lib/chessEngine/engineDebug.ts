export interface EngineDebugSnapshot {
  typeofStockfish: string;
  typeofModule: string;
  typeofFactory: string;
  moduleKeys: string[];
  hasInstance: boolean;
  error?: string;
  notes?: string[];
}

/**
 * Run a minimal one-shot check against the stockfish worker and return a concise snapshot.
 * Use from console: await window.runEngineDebug()
 */
export const runEngineDebug = async (): Promise<EngineDebugSnapshot> => {
  return new Promise((resolve) => {
    const worker = new Worker('/stockfish/engine-worker.js');

    const finish = (snapshot: EngineDebugSnapshot) => {
      worker.terminate();
      resolve(snapshot);
    };

    // Safety timeout in case the worker hangs
    const timeout = setTimeout(() => {
      finish({
        typeofStockfish: 'unknown',
        typeofModule: 'unknown',
        typeofFactory: 'unknown',
        moduleKeys: [],
        hasInstance: false,
        error: 'timeout',
      });
    }, 2000);

    worker.onmessage = (e) => {
      const { type, ...rest } = e.data || {};
      if (type === 'inspect') {
        clearTimeout(timeout);
        finish({
          typeofStockfish: String(rest.typeofStockfish),
          typeofModule: String(rest.typeofModule),
          typeofFactory: String(rest.typeofFactory),
          moduleKeys: Array.isArray(rest.moduleKeys) ? rest.moduleKeys.slice(0, 10) : [],
          hasInstance: !!rest.hasInstance,
          notes: rest.notes ? [String(rest.notes)] : [],
        });
      }
    };

    worker.onerror = (err) => {
      clearTimeout(timeout);
      finish({
        typeofStockfish: 'error',
        typeofModule: 'error',
        typeofFactory: 'error',
        moduleKeys: [],
        hasInstance: false,
        error: err.message || String(err),
      });
    };

    worker.postMessage({ type: 'init' });
    // Ask for an inspect snapshot once ready
    worker.postMessage({ type: 'inspect' });
  });
};

declare global {
  interface Window {
    runEngineDebug?: () => Promise<EngineDebugSnapshot>;
  }
}
