"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface StepCardProps {
  text: string;
  size: 1 | 2 | 3;
  showIcon?: boolean;
}

function StepCard({ text, size, showIcon = true }: StepCardProps) {
  // All cards have equal width (fill), but different heights (only on desktop)
  const heightClasses = {
    1: "", // hug content - natural height
    2: "lg:h-[160px]", // fixed height on desktop only
    3: "lg:h-[200px]", // fixed height on desktop only
  };

  return (
    <Card
      className={cn(
        "border-2 shadow-none bg-background relative z-[2] w-full flex-1 basis-full lg:flex-[0_0_25%]",
        heightClasses[size]
      )}
    >
      <CardContent
        className={cn(
          "p-6 flex flex-col justify-between gap-4",
          size === 1 ? "" : "lg:h-full" // Only use h-full for fixed height cards on desktop
        )}
      >
        {showIcon && (
          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-green-100 border-4 border-green-50 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-green-600" />
            </div>
          </div>
        )}
        <p className="text-xl font-semibold text-foreground leading-[1.2] tracking-[-0.02em]">
          {text}
        </p>
      </CardContent>
    </Card>
  );
}

const ROTATION_INTERVAL = 2000;
const TRANSITION_DURATION = 450;
const STACK_LAYERS = 3;
const STACK_CARD_HEIGHT = 240;
const STACK_GAP = 16;

interface AnimatedOutcomeCardProps {
  text: string;
  duration: number;
}

function ActiveOutcomeCard({ text, duration }: AnimatedOutcomeCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={cn(
        "absolute left-0 right-0 bottom-0 z-20 rounded-xl border-2 border-border bg-background px-6 py-6 flex flex-col justify-between gap-6 transition-all",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      )}
      style={{ transitionDuration: `${duration}ms`, height: `${STACK_CARD_HEIGHT}px` }}
    >
      <div className="w-10 h-10 rounded-full bg-green-100 border-4 border-green-50 flex items-center justify-center flex-shrink-0">
        <Check className="w-5 h-5 text-green-600" />
      </div>
      <p className="text-xl font-semibold text-foreground leading-tight tracking-[-0.02em]">
        {text}
      </p>
    </div>
  );
}

interface ExitingOutcomeCardProps extends AnimatedOutcomeCardProps {
  onExited: () => void;
}

function ExitingOutcomeCard({ text, duration, onExited }: ExitingOutcomeCardProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setLeaving(true));
    const timeout = window.setTimeout(onExited, duration);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [duration, onExited]);

  return (
    <div
      className={cn(
        "absolute left-0 right-0 bottom-0 z-10 rounded-xl border-2 border-border bg-background px-6 py-6 flex flex-col justify-between gap-6 transition-all",
        leaving ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
      )}
      style={{ transitionDuration: `${duration}ms`, height: `${STACK_CARD_HEIGHT}px` }}
    >
      <div className="w-10 h-10 rounded-full bg-green-100 border-4 border-green-50 flex items-center justify-center flex-shrink-0">
        <Check className="w-5 h-5 text-green-600" />
      </div>
      <p className="text-xl font-semibold text-foreground leading-tight tracking-[-0.02em]">
        {text}
      </p>
    </div>
  );
}

interface RotatingOutcomeStackProps {
  items: string[];
}

function RotatingOutcomeStack({ items }: RotatingOutcomeStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const hasMultipleItems = items.length > 1;
  const [stackOrder, setStackOrder] = useState<number[]>(() =>
    Array.from({ length: STACK_LAYERS }, (_, idx) => idx)
  );

  const resetStackOrder = useCallback(() => {
    setStackOrder(Array.from({ length: STACK_LAYERS }, (_, idx) => idx));
  }, []);

  const rotateStackOrderForward = useCallback((order: number[]) => {
    if (order.length <= 1) {
      return order;
    }
    const next = [...order];
    const first = next.shift()!;
    next.push(first);
    return next;
  }, []);

  useEffect(() => {
    resetStackOrder();
  }, [resetStackOrder]);

  useEffect(() => {
    if (!hasMultipleItems) {
      return undefined;
    }

    intervalRef.current = window.setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % items.length;
        setPreviousIndex(prevIndex);
        setStackOrder((prevOrder) => rotateStackOrderForward(prevOrder));
        return nextIndex;
      });
    }, ROTATION_INTERVAL);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasMultipleItems, items.length, rotateStackOrderForward]);

  const handleExitComplete = useCallback(() => {
    setPreviousIndex(null);
  }, []);

  const activeText = items[currentIndex] ?? "";

  return (
    <div
      className="relative w-full mt-3"
      style={{ height: STACK_CARD_HEIGHT + STACK_GAP * STACK_LAYERS }}
    >
      {stackOrder.map((position, index) => {
        const layerIndex = position + 1;
        const bottomOffset = layerIndex * STACK_GAP;
        const scaleValue = 1 - layerIndex * 0.05;
        const opacityValue = 1 - layerIndex * 0.35;
        const zIndexValue = STACK_LAYERS - position;

        return (
          <div
            key={`stack-${index}`}
            className="absolute inset-x-0 flex justify-center pointer-events-none"
            style={{
              bottom: bottomOffset,
              transform: `scale(${scaleValue})`,
              opacity: opacityValue,
              zIndex: zIndexValue,
              transition: `bottom ${TRANSITION_DURATION}ms ease-out, transform ${TRANSITION_DURATION}ms ease-out, opacity ${TRANSITION_DURATION}ms ease-out`,
              willChange: "bottom, transform, opacity",
            }}
          >
            <div className="w-full" style={{ height: STACK_CARD_HEIGHT }}>
              <div className="h-full w-full rounded-xl border-2 border-border bg-background" />
            </div>
          </div>
        );
      })}

      {previousIndex !== null && items[previousIndex] !== undefined && (
        <ExitingOutcomeCard
          key={`prev-${previousIndex}`}
          text={items[previousIndex]}
          duration={TRANSITION_DURATION}
          onExited={handleExitComplete}
        />
      )}

      <ActiveOutcomeCard
        key={`active-${currentIndex}`}
        text={activeText}
        duration={TRANSITION_DURATION}
      />
    </div>
  );
}

function RotatingOutcomeCard({ items }: { items: string[] }) {
  return (
    <div className="relative w-full flex-1 basis-full lg:flex-[0_0_25%] lg:h-[300px] overflow-visible">
      <RotatingOutcomeStack items={items} />
    </div>
  );
}

export function HowItWorks() {
  const steps = [
    { text: "Create project", size: 1 as const },
    { text: "Apply and get funded", size: 2 as const },
    { text: "Add milestones, metrics and updates", size: 3 as const },
  ];

  const outcomes = [
    "Build reputation",
    "Get retrofunding",
    "Get donations",
    "Apply for more funding",
  ];

  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 w-full")}>
      {/* Header */}
      <div className="flex flex-col items-start gap-4">
        <Badge variant="secondary">How It Works</Badge>
        <div className="flex flex-col">
          <h2 className={cn("section-title text-foreground mb-8 lg:mb-0")}>
            One profile.
            <br />
            <span className="text-muted-foreground">Unlimited possibilities.</span>
          </h2>
        </div>
      </div>

      {/* Flow Diagram */}
      <div className="flex flex-col lg:flex-row lg:justify-between items-start gap-2 lg:gap-2 w-full relative lg:-mt-12">
        {/* Connector line - vertical on mobile, horizontal on desktop */}
        <div className="absolute left-1/2 lg:left-0 top-0 lg:top-auto lg:bottom-[80px] -translate-x-1/2 lg:translate-x-0 w-px lg:w-[calc(100%-2rem)] h-full lg:h-[2px] bg-border z-0" />

        {/* Step Cards */}
        <div className="flex flex-col lg:flex-row lg:justify-between items-end gap-4 lg:gap-4 flex-1 w-full lg:w-auto relative z-10">
          {steps.map((step, index) => (
            <StepCard key={index} text={step.text} size={step.size} />
          ))}
          <RotatingOutcomeCard items={outcomes} />
        </div>
      </div>

      <div className="mt-12 flex flex-col lg:flex-row lg:items-center gap-6 w-full">
        <p className="text-base text-muted-foreground">Ready to get started?</p>
        <Button>Create Project</Button>
      </div>
    </section>
  );
}
