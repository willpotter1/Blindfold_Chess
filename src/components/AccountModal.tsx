import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
};

export const AccountModal = ({ isOpen, onClose, title, description, children }: AccountModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const open = useCallback(() => {
    setIsVisible(true);
    setIsAnimating(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsAnimating(false));
    });
  }, []);

  const close = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimating(false);
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) open();
  }, [isOpen, open]);

  useEffect(() => {
    if (!isVisible) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleEscape);
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isVisible, close]);

  const isRevealed = isVisible && !isAnimating;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — solid color + blur, no gradient */}
      <div
        className="absolute inset-0 bg-background/60 transition-all duration-300 ease-out"
        style={{
          opacity: isRevealed ? 1 : 0,
          backdropFilter: isRevealed ? 'blur(6px)' : 'blur(0px)',
          WebkitBackdropFilter: isRevealed ? 'blur(6px)' : 'blur(0px)',
        }}
        onClick={close}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border/50 bg-card shadow-theme-strong"
        style={{
          opacity: isRevealed ? 1 : 0,
          transform: isRevealed ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.98)',
          transition: isRevealed
            ? 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1)'
            : 'opacity 200ms ease-out, transform 200ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-7 w-7 shrink-0 rounded-lg p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={close}
          >
            <X size={14} />
          </Button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 pt-4">
          {children}
        </div>
      </div>
    </div>
  );
};
