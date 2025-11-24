import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatusBarProps {
  status: string;
  result?: string | null;
  isEngineThinking?: boolean;
}

export const StatusBar = ({ status, result, isEngineThinking }: StatusBarProps) => {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">{status}</p>
            {result && (
              <Badge variant="secondary" className="font-mono">
                Result: {result}
              </Badge>
            )}
          </div>
          {isEngineThinking && (
            <Badge variant="outline" className="animate-pulse">
              🤔 Engine thinking...
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
