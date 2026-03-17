import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatusBarProps {
  status: string;
  result?: string | null;
}

export const StatusBar = ({ status, result }: StatusBarProps) => {
  const lastComputerMovePrefix = 'Last computer move: ';
  const isLastComputerMoveStatus = status.startsWith(lastComputerMovePrefix);
  const lastComputerMove = isLastComputerMoveStatus ? status.slice(lastComputerMovePrefix.length) : null;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="space-y-1">
          {isLastComputerMoveStatus ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">Last move:</p>
              <p className="text-center text-[4.5rem] font-semibold leading-none text-[#8B4513]">{lastComputerMove}</p>
            </div>
          ) : (
            <p className="text-sm font-medium">{status}</p>
          )}
          {result && (
            <Badge variant="secondary" className="font-mono">
              Result: {result}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
