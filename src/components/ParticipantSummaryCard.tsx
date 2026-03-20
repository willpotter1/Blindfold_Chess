import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ParticipantSummaryCardModel {
  label: 'Computer' | 'Player';
  pieceColor: 'white' | 'black';
  material: number;
  materialAdvantage: number;
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

  return (
    <Card className={cn('bg-gradient-to-r from-[#fffaf4] via-[#fcf4ea] to-[#fff7ef]', className)}>
      <CardContent className="p-3.5 pt-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d9b99b] bg-white/90 shadow-sm">
            <img
              src={participant.iconSrc}
              alt={participant.iconAlt}
              className="h-8 w-8 object-contain"
              draggable={false}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#8B4513]/65">
                  {participant.label}
                </p>
                <p className="truncate text-base font-semibold text-[#8B4513]">
                  {pieceColorLabel} pieces
                </p>
              </div>

              {participant.isToMove && (
                <Badge className="shrink-0 border-[#8B4513]/15 bg-[#8B4513] text-white hover:bg-[#8B4513]">
                  To move
                </Badge>
              )}
            </div>

            <div className="mt-2.5">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#8B4513]/65">
                Material
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-[1.65rem] font-bold leading-none text-[#8B4513]">
                  {participant.material}
                </p>
                {participant.materialAdvantage > 0 && (
                  <p className="text-base font-semibold leading-none text-emerald-700">
                    +{participant.materialAdvantage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
