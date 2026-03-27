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
}

interface ParticipantSummaryCardProps {
  participant: ParticipantSummaryCardModel;
  className?: string;
}

export const ParticipantSummaryCard = ({
  participant,
  className,
}: ParticipantSummaryCardProps) => {
  const pieceColorLabel = participant.pieceColor === 'white' ? 'White' : 'Black';
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
      <CardContent className="p-3 pt-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-border bg-surface-white shadow-theme-soft">
            <img
              src={participant.iconSrc}
              alt={participant.iconAlt}
              className="h-7 w-7 object-contain"
              draggable={false}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary/65">
                  {participant.label}
                </p>
                <p className="truncate text-sm font-semibold text-primary">
                  {pieceColorLabel} pieces
                </p>
              </div>

              {participant.isToMove && (
                <Badge className="shrink-0 border-border bg-primary text-primary-foreground hover:bg-primary">
                  To move
                </Badge>
              )}
            </div>

            <div className="mt-2">
              <div className="min-h-6">
                <div className="flex min-h-6 flex-wrap items-center gap-1">
                  {participant.capturedPieces.map((piece, index) => (
                    <img
                      key={`${piece.color}-${piece.type}-${index}`}
                      src={getCapturedPieceSrc(piece)}
                      alt={getCapturedPieceAlt(piece)}
                      className="h-5 w-5 object-contain"
                      draggable={false}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
