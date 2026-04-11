import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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

export const ParticipantSummaryCard = ({
  participant,
  className,
  compact = false,
}: ParticipantSummaryCardProps) => {
  const pieceColorLabel = participant.pieceColor === 'white' ? 'White' : 'Black';
  const compactPawnSrc = `${assetBase}/pieces/${participant.pieceColor === 'white' ? 'w' : 'b'}P.svg`;
  const compactPawnAlt = `${pieceColorLabel} pawn`;
  const getCapturedPieceSrc = (piece: CapturedPieceDescriptor) => {
    const pieceColorKey = piece.color === 'white' ? 'w' : 'b';
    return `${assetBase}/pieces/${pieceColorKey}${piece.type.toUpperCase()}.svg`;
  };
  const getCapturedPieceAlt = (piece: CapturedPieceDescriptor) => (
    `${piece.color === 'white' ? 'White' : 'Black'} ${piece.type === 'q'
      ? 'queen'
      : piece.type === 'r'
        ? 'rook'
        : piece.type === 'b'
          ? 'bishop'
          : piece.type === 'n'
            ? 'knight'
            : 'pawn'}`
  );

  return (
    <Card className={cn('bg-surface-white/75', className)}>
      <CardContent className={cn('p-3 pt-3', compact && 'px-2.5 py-2')}>
        <div className={cn('flex items-center gap-2.5', compact && 'gap-2')}>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-border bg-surface-white shadow-theme-soft', compact && 'h-8 w-8 rounded-xl')}>
            <img
              src={compact ? compactPawnSrc : participant.iconSrc}
              alt={compact ? compactPawnAlt : participant.iconAlt}
              className={cn('h-7 w-7 object-contain', compact && 'h-5 w-5')}
              draggable={false}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cn('text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary/65', compact && 'text-[0.58rem] tracking-[0.14em]')}>
                  {participant.label}
                </p>
                {!compact && (
                  <p className="truncate text-sm font-semibold text-primary">
                    {pieceColorLabel} pieces
                  </p>
                )}
              </div>

              {participant.isToMove && (
                <Badge className={cn('shrink-0 border-border bg-primary text-primary-foreground hover:bg-primary', compact && 'px-1.5 py-0 text-[0.6rem]')}>
                  To move
                </Badge>
              )}
            </div>

            <div className={cn('mt-2', compact && 'mt-1')}>
              <div className={cn('min-h-6', compact && 'min-h-5')}>
                <div className={cn('flex min-h-6 flex-wrap items-center gap-1', compact && 'min-h-5 gap-0.5')}>
                  {participant.capturedPieces.map((piece, index) => (
                    <img
                      key={`${piece.color}-${piece.type}-${index}`}
                      src={getCapturedPieceSrc(piece)}
                      alt={getCapturedPieceAlt(piece)}
                      className={cn('h-5 w-5 object-contain', compact && 'h-4 w-4')}
                      draggable={false}
                    />
                  ))}
                  {compact && typeof participant.materialAdvantage === 'number' && participant.materialAdvantage > 0 && (
                    <span className="ml-1 text-xs font-semibold text-primary">
                      +{participant.materialAdvantage}
                    </span>
                  )}
                  {compact && participant.capturedPieces.length === 0 && participant.materialAdvantage === 0 && (
                    <span className="sr-only">No captured material</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
