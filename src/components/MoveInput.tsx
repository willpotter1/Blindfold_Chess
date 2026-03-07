import { useEffect, useRef, useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface MoveInputProps {
  onSubmitMove: (move: string) => void;
  disabled: boolean;
  errorMessage?: string;
}

export const MoveInput = ({ onSubmitMove, disabled, errorMessage }: MoveInputProps) => {
  const [moveInput, setMoveInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (disabled) return;

    const focusInput = () => inputRef.current?.focus();
    const frameId = requestAnimationFrame(focusInput);

    return () => cancelAnimationFrame(frameId);
  }, [disabled]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (moveInput.trim() && !disabled) {
      onSubmitMove(moveInput.trim());
      setMoveInput('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="move-input" className="text-sm font-medium">
              Enter Your Move (SAN) or click-to-move
            </label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                id="move-input"
                type="text"
                value={moveInput}
                onChange={(e) => setMoveInput(e.target.value)}
                placeholder="e.g., e4, Nf3, O-O, Qxe6+"
                disabled={disabled}
                className="font-mono"
              />
              <Button type="submit" disabled={disabled || !moveInput.trim()}>
                Play
              </Button>
            </div>
          </div>
          
          {errorMessage && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {errorMessage}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Examples: e4, Nf3, exd5, O-O (castling), e8=Q (promotion), Qxe6+ (capture with check)
          </p>
        </form>
      </CardContent>
    </Card>
  );
};
