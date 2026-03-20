import { useEffect, useRef, useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MoveInputProps {
  onSubmitMove: (move: string) => void;
  disabled: boolean;
  errorMessage?: string;
  variant?: 'default' | 'compact';
}

export const MoveInput = ({
  onSubmitMove,
  disabled,
  errorMessage,
  variant = 'default',
}: MoveInputProps) => {
  const [moveInput, setMoveInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isCompact = variant === 'compact';

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
      <CardContent className={cn(isCompact ? 'p-4 pt-4' : 'pt-6')}>
        <form onSubmit={handleSubmit} className={cn(isCompact ? 'space-y-2.5' : 'space-y-3')}>
          <div className={cn(isCompact ? 'space-y-1.5' : 'space-y-2')}>
            <label
              htmlFor="move-input"
              className={cn('font-medium', isCompact ? 'text-xs uppercase tracking-[0.16em] text-[#8B4513]/75' : 'text-sm')}
            >
              Enter Your Move (SAN)
            </label>
            <div className={cn('gap-2', isCompact ? 'flex flex-col' : 'flex')}>
              <Input
                ref={inputRef}
                id="move-input"
                type="text"
                value={moveInput}
                onChange={(e) => setMoveInput(e.target.value)}
                placeholder={isCompact ? 'e4, Nf3, O-O' : 'e.g., e4, Nf3, O-O, Qxe6+'}
                disabled={disabled}
                className={cn('font-mono', isCompact && 'text-sm')}
              />
              <Button
                type="submit"
                disabled={disabled || !moveInput.trim()}
                className={cn(isCompact && 'w-full')}
              >
                Play
              </Button>
            </div>
          </div>
          
          {errorMessage && (
            <div className={cn('rounded bg-destructive/10 p-2 text-destructive', isCompact ? 'text-xs' : 'text-sm')}>
              {errorMessage}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
