import { Card, CardContent } from '@/components/ui/card';

interface StatusBarProps {
  status: string;
}

export const StatusBar = ({ status }: StatusBarProps) => {
  const lastComputerMovePrefix = 'Last computer move: ';
  const [primaryStatus, secondaryStatus] = status.split('\n');
  const isLastComputerMoveStatus = primaryStatus.startsWith(lastComputerMovePrefix);
  const isTurnStatus = /^(White|Black) to move$/.test(primaryStatus);
  const lastComputerMove = isLastComputerMoveStatus ? primaryStatus.slice(lastComputerMovePrefix.length) : null;
  const largeDisplayText = isLastComputerMoveStatus ? lastComputerMove : isTurnStatus ? primaryStatus : null;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="space-y-1">
          {largeDisplayText ? (
            <div className="space-y-1">
              <p className={`text-center font-semibold leading-none text-[#8B4513] ${isTurnStatus ? 'text-[2.25rem]' : 'text-[4.5rem]'}`}>
                {largeDisplayText}
              </p>
              {secondaryStatus && <p className="text-center text-sm font-medium text-[#8B4513]">{secondaryStatus}</p>}
            </div>
          ) : (
            <p className="text-sm font-medium">{status}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
