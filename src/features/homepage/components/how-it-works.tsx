"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";
import { CreateProjectButton } from "./create-project-button";

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
const TRANSITION_DURATION = 700;
const STACK_LAYERS = 4;
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
  const hasMultipleItems = items.length > 1;
  const [order, setOrder] = useState<number[]>(() => {
    // Initialize with first 4 items (or wrap around if less than 4)
    const initialOrder: number[] = [];
    for (let i = 0; i < STACK_LAYERS && i < items.length; i++) {
      initialOrder.push(i);
    }
    // If we have fewer items than layers, repeat items
    while (initialOrder.length < STACK_LAYERS) {
      initialOrder.push(initialOrder.length % items.length);
    }
    return initialOrder;
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasMultipleItems) {
      return undefined;
    }

    intervalRef.current = window.setInterval(() => {
      setIsAnimating(true);

      setTimeout(() => {
        setOrder((prev) => {
          const newOrder = [...prev];
          const first = newOrder.shift()!;
          newOrder.push(first);
          return newOrder;
        });
        setIsAnimating(false);
      }, TRANSITION_DURATION);
    }, ROTATION_INTERVAL);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasMultipleItems, items.length]);

  // The card that will enter at the back (currently front card)
  const enteringCardIndex = order[0];

  return (
    <div className="relative w-full mt-3 overflow-visible" style={{ height: "288px" }}>
      {order.map((cardIndex, stackPosition) => {
        const cardText = items[cardIndex] ?? "";
        const isLeaving = isAnimating && stackPosition === 0;

        // During animation, cards 1-3 shift forward one position
        let scale: number;
        let y: number;
        let opacity: number;
        let filter: string;

        if (isLeaving) {
          scale = 1.075;
          y = 40;
          opacity = 0;
          filter = "blur(20px)";
        } else {
          const targetPos = isAnimating ? stackPosition - 1 : stackPosition;
          scale = 1 - targetPos * 0.075;
          y = -(targetPos * 40);
          opacity = Math.max(0, 1 - targetPos * 0.2);
          filter = "blur(0px)";
        }

        const zIndex = isLeaving ? 5 : isAnimating ? 4 - (stackPosition - 1) : 4 - stackPosition;

        return (
          <div
            key={`card-${cardIndex}-${stackPosition}`}
            className="absolute left-0 right-0 bottom-0 rounded-xl border-2 border-border bg-background px-6 py-6 flex flex-col justify-between gap-6 transition-all ease-out origin-bottom pointer-events-none"
            style={{
              transform: `scale(${scale}) translateY(${y}px)`,
              opacity,
              filter,
              zIndex,
              height: `${STACK_CARD_HEIGHT}px`,
              transitionDuration: `${TRANSITION_DURATION}ms`,
            }}
          >
            <div className="w-10 h-10 rounded-full bg-green-100 border-4 border-green-50 flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xl font-semibold text-foreground leading-tight tracking-[-0.02em]">
              {cardText}
            </p>
          </div>
        );
      })}

      {/* Entering card - rendered separately during animation */}
      <div
        key={`entering-${enteringCardIndex}`}
        className="absolute left-0 right-0 bottom-0 rounded-xl border-2 border-border bg-background px-6 py-6 flex flex-col justify-between gap-6 transition-all ease-out origin-bottom pointer-events-none"
        style={{
          transform: `scale(${isAnimating ? 1 - 3 * 0.075 : 1 - 4 * 0.075}) translateY(${isAnimating ? -(3 * 40) : -(4 * 40)}px)`,
          opacity: isAnimating ? Math.max(0, 1 - 3 * 0.2) : 0,
          filter: "blur(0px)",
          zIndex: 0,
          height: `${STACK_CARD_HEIGHT}px`,
          transitionDuration: `${TRANSITION_DURATION}ms`,
        }}
      >
        <div className="w-10 h-10 rounded-full bg-green-100 border-4 border-green-50 flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-green-600" />
        </div>
        <p className="text-xl font-semibold text-foreground leading-tight tracking-[-0.02em]">
          {items[enteringCardIndex]}
        </p>
      </div>
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
      <SectionContainer>
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
          <CreateProjectButton />
        </div>
      </SectionContainer>
    </section>
  );
}
