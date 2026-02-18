import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatusBarProps {
  status: string;
  result?: string | null;
}

export const StatusBar = ({ status, result }: StatusBarProps) => {
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
        </div>
      </CardContent>
    </Card>
  );
};
