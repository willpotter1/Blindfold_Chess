import { cn } from '@/lib/utils';
import { type VisionBoardPiece } from '@/lib/visionTrainer';

type DrillsActivePanelProps = {
  moveLabel: string;
  score: number;
  timeRemainingSeconds: number;
  piecePlacements?: readonly VisionBoardPiece[];
  panelPadding: number;
  sectionGap: number;
  className?: string;
};

const ActiveMetric = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="rounded-xl border-2 border-[#d9b99b] bg-white p-4 text-center">
    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8B4513]">{label}</div>
    <div className="mt-2 text-3xl font-semibold text-black">{value}</div>
  </div>
);

const colorLabel = (color: VisionBoardPiece['color']) => (
  color === 'white' ? 'White' : 'Black'
);

export const DrillsActivePanel = ({
  moveLabel,
  score,
  timeRemainingSeconds,
  piecePlacements = [],
  panelPadding,
  sectionGap,
  className,
}: DrillsActivePanelProps) => {
  const moveFontSize = Math.max(40, Math.round(panelPadding * 2.35));

  return (
    <div
      className={cn('flex flex-col', className)}
      style={{
        gap: `${sectionGap}px`,
      }}
    >
      <div className="rounded-[1.4rem] border-2 border-[#d9b99b] bg-[#fffaf5] px-4 py-6 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8B4513]">Move</div>
        <div className="mt-3 font-semibold leading-none text-black" style={{ fontSize: `${moveFontSize}px` }}>
          {moveLabel}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ActiveMetric label="Score" value={score} />
        <ActiveMetric label="Time" value={`${timeRemainingSeconds}s`} />
      </div>

      {piecePlacements.length > 0 && (
        <div className="grid gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8B4513]">
            Piece Positions
          </div>

          <div className="grid gap-2">
            {piecePlacements.map((piece) => (
              <div
                key={`${piece.color}-${piece.type}-${piece.square}`}
                className="flex items-center justify-between rounded-xl border border-[#d9b99b] bg-white px-4 py-3"
              >
                <div className="text-sm font-medium text-black">
                  {colorLabel(piece.color)} {piece.displayName}
                </div>
                <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[#8B4513]">
                  {piece.square}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
