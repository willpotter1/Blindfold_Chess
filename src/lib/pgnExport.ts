import type { GameMode } from '@/lib/gameSession';

const CHESS_COM_ANALYSIS_URL = 'https://www.chess.com/analysis';
const LICHESS_PASTE_URL = 'https://lichess.org/paste';
const MAX_CHESS_COM_URL_LENGTH = 7000;
const PGN_RESULT_REGEX = /^\[Result\s+"([^"]+)"\]\s*$/m;

type ToastInput = {
  title: string;
  description: string;
  variant?: 'destructive';
};

type ToastFn = (input: ToastInput) => void;

type PgnResult = '1-0' | '0-1' | '1/2-1/2' | null;

const getValidatedPgn = (pgn: string, toast: ToastFn): string | null => {
  const trimmedPgn = pgn.trim();

  if (!trimmedPgn) {
    toast({
      title: 'Export failed',
      description: 'No PGN is available for this game.',
      variant: 'destructive',
    });
    return null;
  }

  return trimmedPgn;
};

const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textArea);

  return copied;
};

export const getPgnResult = (pgn: string): PgnResult => {
  const match = pgn.match(PGN_RESULT_REGEX);
  const value = match?.[1];

  if (value === '1-0' || value === '0-1' || value === '1/2-1/2') {
    return value;
  }

  return null;
};

export const getPgnResultLabel = (pgn: string): string => {
  const result = getPgnResult(pgn);

  switch (result) {
    case '1-0':
      return 'White won';
    case '0-1':
      return 'Black won';
    case '1/2-1/2':
      return 'Draw';
    default:
      return 'Unknown';
  }
};

export const getGameModeLabel = (mode: GameMode): string => (
  mode === 'computer' ? 'Vs computer' : 'Pass n play'
);

export const exportPgnToChessCom = async (pgn: string, toast: ToastFn): Promise<void> => {
  const validatedPgn = getValidatedPgn(pgn, toast);

  if (!validatedPgn) {
    return;
  }

  const encoded = encodeURIComponent(validatedPgn);
  const url = `${CHESS_COM_ANALYSIS_URL}?pgn=${encoded}`;

  if (url.length <= MAX_CHESS_COM_URL_LENGTH) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    const copied = await copyTextToClipboard(validatedPgn);

    if (!copied) {
      throw new Error('Clipboard copy failed');
    }
  } catch {
    toast({
      title: 'Export failed',
      description: 'Could not copy PGN to clipboard automatically.',
      variant: 'destructive',
    });
    return;
  }

  window.open(CHESS_COM_ANALYSIS_URL, '_blank', 'noopener,noreferrer');
  toast({
    title: 'PGN copied',
    description: "PGN copied. On Chess.com click 'Load From FEN/PGN(s)' and paste, then Load.",
  });
};

export const exportPgnToLichess = async (pgn: string, toast: ToastFn): Promise<void> => {
  const validatedPgn = getValidatedPgn(pgn, toast);

  if (!validatedPgn) {
    return;
  }

  try {
    const copied = await copyTextToClipboard(validatedPgn);

    if (!copied) {
      throw new Error('Clipboard copy failed');
    }
  } catch {
    toast({
      title: 'Export failed',
      description: 'Could not copy PGN to clipboard automatically.',
      variant: 'destructive',
    });
    return;
  }

  window.open(LICHESS_PASTE_URL, '_blank', 'noopener,noreferrer');
  toast({
    title: 'PGN copied',
    description: 'PGN copied. Paste it into Lichess and click Import.',
  });
};
