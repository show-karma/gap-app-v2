"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/utilities/tailwind";

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /**
   * aria-label for each thumb, indexed in order.
   * When provided, overrides the default aria-label on each Thumb.
   */
  thumbLabels?: string[];
  /** Optional class overrides for the inner parts (merged after the defaults). */
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
}

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, thumbLabels, trackClassName, rangeClassName, thumbClassName, ...props }, ref) => {
    const values = props.value ?? props.defaultValue ?? [0];
    const thumbKeys = values.map((_, index) => `thumb-${index}`);

    return (
      <SliderPrimitive.Root
        ref={ref}
        className={cn("relative flex w-full touch-none select-none items-center", className)}
        {...props}
      >
        <SliderPrimitive.Track
          className={cn(
            "relative h-1.5 w-full grow overflow-hidden rounded-full bg-border",
            trackClassName
          )}
        >
          <SliderPrimitive.Range className={cn("absolute h-full bg-foreground", rangeClassName)} />
        </SliderPrimitive.Track>
        {thumbKeys.map((thumbKey, index) => (
          <SliderPrimitive.Thumb
            key={thumbKey}
            aria-label={thumbLabels?.[index]}
            className={cn(
              "block h-4 w-4 rounded-full border border-foreground/50 bg-background shadow transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              "cursor-grab active:cursor-grabbing",
              thumbClassName
            )}
          />
        ))}
      </SliderPrimitive.Root>
    );
  }
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
