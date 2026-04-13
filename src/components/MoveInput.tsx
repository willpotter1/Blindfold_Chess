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
  className?: string;
  fillHeight?: boolean;
}

export const MoveInput = ({
  onSubmitMove,
  disabled,
  errorMessage,
  variant = 'default',
  className,
  fillHeight = false,
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
    <Card className={cn('bg-card', fillHeight && 'h-full', className)}>
      <CardContent className={cn(isCompact ? 'p-3.5 pt-3.5' : 'pt-6', fillHeight && 'flex h-full flex-col')}>
        <form onSubmit={handleSubmit} className={cn(isCompact ? 'space-y-2.5' : 'space-y-3', fillHeight && 'flex h-full flex-col')}>
          <div className={cn(isCompact ? 'space-y-1.5' : 'space-y-2')}>
            <label
              htmlFor="move-input"
              className={cn('font-medium', isCompact ? 'text-xs uppercase tracking-[0.16em] text-primary/75' : 'text-sm')}
            >
              Enter Your Move (SAN)
            </label>
            <div className={cn('gap-2', isCompact ? 'grid grid-cols-[minmax(0,1fr)_auto] items-center' : 'flex')}>
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
                className={cn(isCompact && 'min-w-[96px] px-5')}
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
