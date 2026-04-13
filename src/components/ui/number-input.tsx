import * as React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  onValueCommit?: (value: number) => void;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, onValueCommit, step = 1, min, max, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const combinedRef = (node: HTMLInputElement | null) => {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };

    const nudge = (direction: 1 | -1) => {
      const input = inputRef.current;
      if (!input || input.disabled) return;

      const current = parseFloat(input.value) || 0;
      const stepNum = typeof step === "string" ? parseFloat(step) || 1 : step;
      let next = current + stepNum * direction;

      if (min !== undefined) next = Math.max(Number(min), next);
      if (max !== undefined) next = Math.min(Number(max), next);

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(input, String(next));
      input.dispatchEvent(new Event("input", { bubbles: true }));

      if (onValueCommit) onValueCommit(next);
    };

    return (
      <div className={cn("group relative", className)}>
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          className="flex h-10 w-full rounded-lg border border-border/50 bg-card px-3 py-2 pr-8 text-base text-foreground transition-colors placeholder:text-muted-foreground/60 focus-visible:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          ref={combinedRef}
          {...props}
        />
        <div className="absolute right-1 top-1 bottom-1 flex flex-col">
          <button
            type="button"
            tabIndex={-1}
            className="flex flex-1 items-center justify-center rounded-t-md px-1 text-muted-foreground/50 transition-colors hover:bg-secondary hover:text-foreground"
            onClick={() => nudge(1)}
            aria-label="Increment"
          >
            <ChevronUp size={12} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="flex flex-1 items-center justify-center rounded-b-md px-1 text-muted-foreground/50 transition-colors hover:bg-secondary hover:text-foreground"
            onClick={() => nudge(-1)}
            aria-label="Decrement"
          >
            <ChevronDown size={12} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  },
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
