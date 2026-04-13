import type { CapturedPieceDescriptor } from '@/lib/chess/material';
import { cn } from '@/lib/utils';

const assetBase = import.meta.env.BASE_URL.replace(/\/$/, '');

export interface ParticipantSummaryCardModel {
  label: string;
  pieceColor: 'white' | 'black';
  capturedPieces: CapturedPieceDescriptor[];
  isToMove: boolean;
  iconSrc: string;
  iconAlt: string;
  materialAdvantage?: number;
}

interface ParticipantSummaryCardProps {
  participant: ParticipantSummaryCardModel;
  className?: string;
  compact?: boolean;
}

const getCapturedPieceSrc = (piece: CapturedPieceDescriptor) => {
  const colorKey = piece.color === 'white' ? 'w' : 'b';
  return `${assetBase}/pieces/${colorKey}${piece.type.toUpperCase()}.svg`;
};

export const ParticipantSummaryCard = ({
  participant,
  className,
  compact = false,
}: ParticipantSummaryCardProps) => {
  const pieceColorLabel = participant.pieceColor === 'white' ? 'White' : 'Black';
  const pawnSrc = `${assetBase}/pieces/${participant.pieceColor === 'white' ? 'w' : 'b'}P.svg`;

  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card px-3 py-2.5',
        participant.isToMove && 'border-foreground/20',
        className,
      )}
    >
      {/* Top row: icon + name + to-move indicator */}
      <div className="flex items-center gap-2">
        <img
          src={compact ? pawnSrc : participant.iconSrc}
          alt={compact ? `${pieceColorLabel} pawn` : participant.iconAlt}
          className={cn('h-5 w-5 shrink-0 object-contain', compact && 'h-4 w-4')}
          draggable={false}
        />
        <span className={cn('text-xs font-semibold text-foreground', compact && 'text-[0.65rem]')}>
          {participant.label}
        </span>
        <span className={cn('text-[0.6rem] text-muted-foreground', compact && 'text-[0.55rem]')}>
          {pieceColorLabel}
        </span>
        {participant.isToMove && (
          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
        )}
      </div>

      {/* Captured pieces row */}
      <div className={cn('mt-1.5 flex min-h-5 flex-wrap items-center gap-0.5', compact && 'mt-1 min-h-4')}>
        {participant.capturedPieces.map((piece, index) => (
          <img
            key={`${piece.color}-${piece.type}-${index}`}
            src={getCapturedPieceSrc(piece)}
            alt={`Captured ${piece.color} ${piece.type}`}
            className={cn('h-4 w-4 object-contain opacity-60', compact && 'h-3.5 w-3.5')}
            draggable={false}
          />
        ))}
        {typeof participant.materialAdvantage === 'number' && participant.materialAdvantage > 0 && (
          <span className={cn('ml-0.5 text-[0.65rem] font-semibold text-muted-foreground', compact && 'text-[0.6rem]')}>
            +{participant.materialAdvantage}
          </span>
        )}
        {participant.capturedPieces.length === 0 && (
          <span className="text-[0.6rem] text-muted-foreground/40">No captures</span>
        )}
      </div>
    </div>
  );
};
