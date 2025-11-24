// Stockfish Web Worker setup
let stockfishInstance: Worker | null = null;
let messageQueue: Array<{ resolve: (value: string) => void; reject: (reason: Error) => void }> = [];
let isInitialized = false;

export const initStockfish = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isInitialized && stockfishInstance) {
      resolve();
      return;
    }

    try {
      // Use CDN-hosted Stockfish WASM
      const workerCode = `
        importScripts('https://cdn.jsdelivr.net/npm/stockfish@16.0.0/stockfish.js');
        
        let stockfish = null;
        
        self.onmessage = function(e) {
          const { type, data } = e.data;
          
          if (type === 'init') {
            if (typeof Stockfish === 'function') {
              stockfish = Stockfish();
              stockfish.onmessage = function(line) {
                self.postMessage({ type: 'output', data: line });
              };
              self.postMessage({ type: 'ready' });
            }
          } else if (type === 'command' && stockfish) {
            stockfish.postMessage(data);
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      stockfishInstance = new Worker(workerUrl);

      stockfishInstance.onmessage = (e) => {
        const { type, data } = e.data;
        
        if (type === 'ready') {
          isInitialized = true;
          resolve();
        } else if (type === 'output') {
          // Handle bestmove responses
          if (data.startsWith('bestmove')) {
            const match = data.match(/bestmove\s+(\S+)/);
            if (match && messageQueue.length > 0) {
              const { resolve } = messageQueue.shift()!;
              resolve(match[1]);
            }
          }
        }
      };

      stockfishInstance.onerror = (error) => {
        console.error('Stockfish worker error:', error);
        reject(new Error('Failed to initialize Stockfish'));
      };

      // Initialize the worker
      stockfishInstance.postMessage({ type: 'init' });

    } catch (error) {
      console.error('Error creating Stockfish worker:', error);
      reject(error as Error);
    }
  });
};

export const sendCommand = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!stockfishInstance || !isInitialized) {
      reject(new Error('Stockfish not initialized'));
      return;
    }

    messageQueue.push({ resolve, reject });
    stockfishInstance.postMessage({ type: 'command', data: command });

    // Timeout after 10 seconds
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
  }
};
