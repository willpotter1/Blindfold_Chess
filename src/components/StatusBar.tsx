import { Card, CardContent } from '@/components/ui/card';

interface StatusBarProps {
  status: string;
  variant?: 'default' | 'compact';
  className?: string;
  condensed?: boolean;
}

export const StatusBar = ({ status, variant = 'default', className, condensed = false }: StatusBarProps) => {
  const lastComputerMovePrefix = 'Last computer move: ';
  const [primaryStatus, secondaryStatus] = status.split('\n');
  const isLastComputerMoveStatus = primaryStatus.startsWith(lastComputerMovePrefix);
  const checkmateMatch = primaryStatus.match(/^(Checkmate!)\s+(1-0|0-1|1\/2-1\/2)$/);
  const isSolvedStatus = primaryStatus === 'Solved';
  const isCompactDisplayStatus = isLastComputerMoveStatus || Boolean(checkmateMatch) || isSolvedStatus;
  const isTurnStatus = /^(White|Black) to move$/.test(primaryStatus);
  const lastComputerMove = isLastComputerMoveStatus ? primaryStatus.slice(lastComputerMovePrefix.length) : null;
  const largeDisplayText = isLastComputerMoveStatus ? lastComputerMove : (isTurnStatus || isSolvedStatus) ? primaryStatus : null;
  const compactMoveText = lastComputerMove?.trim();
  const compactDisplayLabel = isLastComputerMoveStatus ? 'Last move' : isSolvedStatus ? null : checkmateMatch?.[1] ?? null;
  const compactDisplayValue = isLastComputerMoveStatus ? compactMoveText || '—' : isSolvedStatus ? primaryStatus : checkmateMatch?.[2] ?? null;

  if (variant === 'compact') {
    return (
      <Card className={className ? `bg-surface-white/75 ${className}` : 'bg-surface-white/75'}>
        <CardContent className={`px-4 py-3 pt-3 ${isCompactDisplayStatus ? `flex items-center justify-center ${condensed ? 'min-h-[64px]' : 'min-h-[clamp(90px,12vh,120px)]'}` : ''}`}>
          <div className={`space-y-1 ${isCompactDisplayStatus ? 'w-full text-center' : ''}`}>
            {isCompactDisplayStatus ? (
              <>
                {compactDisplayLabel && (
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary/65">
                    {compactDisplayLabel}
                  </p>
                )}
                <p className={condensed ? 'text-[1.5rem] font-semibold leading-none text-primary' : 'text-[clamp(2rem,3vw,2.75rem)] font-semibold leading-none text-primary'}>
                  {compactDisplayValue}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold leading-snug text-primary">{primaryStatus}</p>
            )}
            {secondaryStatus && (
              <p className="text-xs font-medium leading-snug text-primary/80">{secondaryStatus}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className ? `bg-surface-white/75 ${className}` : 'bg-surface-white/75'}>
      <CardContent className="py-4">
        <div className="space-y-1">
          {largeDisplayText ? (
            <div className="space-y-1">
              <p className={`text-center font-semibold leading-none text-primary ${isTurnStatus ? 'text-[2.25rem]' : 'text-[4.5rem]'}`}>
                {largeDisplayText}
              </p>
              {secondaryStatus && <p className="text-center text-sm font-medium text-primary">{secondaryStatus}</p>}
            </div>
          ) : (
            <p className="text-sm font-medium">{status}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
