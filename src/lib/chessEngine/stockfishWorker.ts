// Stockfish Web Worker setup
let stockfishInstance: Worker | null = null;
let messageQueue: Array<{ resolve: (value: string) => void; reject: (reason: Error) => void }> = [];
let readyQueue: Array<{ resolve: () => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout> }> = [];
let isInitialized = false;
const assetBase = import.meta.env.BASE_URL.replace(/\/$/, '');

export const initStockfish = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isInitialized && stockfishInstance) {
      resolve();
      return;
    }

    try {
      // Use the single-thread engine bundle directly as a worker; it already handles UCI messages
      stockfishInstance = new Worker(`${assetBase}/stockfish/stockfish-nnue-16-single.js`);

      stockfishInstance.onmessage = (e) => {
        console.log('[sf msg]', e.data);
        const data = typeof e.data === 'string' ? e.data : '';

        // First message means the engine is alive
        if (!isInitialized) {
          isInitialized = true;
          resolve();
        }

        if ((data.includes('readyok') || data.includes('uciok')) && readyQueue.length > 0) {
          const { resolve, timer } = readyQueue.shift()!;
          clearTimeout(timer);
          resolve();
        }

        if (data.startsWith('bestmove')) {
          const match = data.match(/bestmove\s+(\S+)/);
          if (match && messageQueue.length > 0) {
            const { resolve } = messageQueue.shift()!;
            resolve(match[1]);
          }
        }
      };

      stockfishInstance.onerror = (error) => {
        console.error('Stockfish worker error:', error);
        reject(new Error('Failed to initialize Stockfish'));
      };
    } catch (error) {
      console.error('Error creating Stockfish worker:', error);
      reject(error as Error);
    }
  });
};

export const sendCommand = (command: string, expectBestMove: boolean = false): Promise<string | void> => {
  return new Promise((resolve, reject) => {
    if (!stockfishInstance || !isInitialized) {
      reject(new Error('Stockfish not initialized'));
      return;
    }

    // The stockfish.js worker expects plain strings, not wrapped objects
    console.log('[sf send]', command, 'expectBestMove=', expectBestMove);
    if (!expectBestMove) {
      stockfishInstance.postMessage(command);
      resolve();
      return;
    }

    // Commands expecting a best move (e.g., "go") are queued and resolved on response
    messageQueue.push({ resolve, reject });
    stockfishInstance.postMessage(command);

    // Timeout after 10 seconds to avoid hanging if the engine fails to respond
    setTimeout(() => {
      const index = messageQueue.findIndex(item => item.resolve === resolve);
      if (index !== -1) {
        messageQueue.splice(index, 1);
        reject(new Error('Stockfish command timeout'));
      }
    }, 10000);
  });
};

export const terminateStockfish = () => {
  if (stockfishInstance) {
    stockfishInstance.terminate();
    stockfishInstance = null;
    isInitialized = false;
    messageQueue = [];
    readyQueue = [];
  }
};

export const waitForReady = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!stockfishInstance || !isInitialized) {
      reject(new Error('Stockfish not initialized'));
      return;
    }
    const timer = setTimeout(() => {
      const index = readyQueue.findIndex(item => item.resolve === resolve);
      if (index !== -1) {
        readyQueue.splice(index, 1);
      }
      reject(new Error('Stockfish readyok timeout'));
    }, 5000);
    readyQueue.push({ resolve, reject, timer });
    stockfishInstance.postMessage('isready');
  });
};
