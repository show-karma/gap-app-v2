"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { CreateProjectButton } from "@/src/features/homepage/components/create-project-button";
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

const ANIMATION_CONFIG = {
  rotationInterval: 2000,
  transitionDuration: 700,
  stackLayers: 4,
  cardHeight: 240,
  stackGap: 16,
  containerHeight: 288, // STACK_CARD_HEIGHT + STACK_GAP + some padding
  scaleStep: 0.075, // How much each card scales down (1 - position * 0.075)
  translateStep: 40, // How much each card moves up (position * 40px)
  opacityStep: 0.2, // How much opacity decreases per layer (1 - position * 0.2)
} as const;

interface RotatingOutcomeStackProps {
  items: string[];
}

// Helper component for card content to reduce duplication
function OutcomeCardContent({ text }: { text: string }) {
  return (
    <>
      <div className="w-10 h-10 rounded-full bg-green-100 border-4 border-green-50 flex items-center justify-center flex-shrink-0">
        <Check className="w-5 h-5 text-green-600" />
      </div>
      <p className="text-xl font-semibold text-foreground leading-tight tracking-[-0.02em]">
        {text}
      </p>
    </>
  );
}

function RotatingOutcomeStack({ items }: RotatingOutcomeStackProps) {
  const hasMultipleItems = items.length > 1;
  const [order, setOrder] = useState<number[]>(() => {
    if (items.length === 0) {
      return [];
    }
    // Initialize with first 4 items (or wrap around if less than 4)
    const initialOrder: number[] = [];
    for (let i = 0; i < ANIMATION_CONFIG.stackLayers && i < items.length; i++) {
      initialOrder.push(i);
    }
    // If we have fewer items than layers, repeat items
    while (initialOrder.length < ANIMATION_CONFIG.stackLayers) {
      initialOrder.push(initialOrder.length % items.length);
    }
    return initialOrder;
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!hasMultipleItems || prefersReducedMotion) {
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
      }, ANIMATION_CONFIG.transitionDuration);
    }, ANIMATION_CONFIG.rotationInterval);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasMultipleItems, prefersReducedMotion]);

  // The card that will enter at the back (currently front card)
  const enteringCardIndex = order[0];

  return (
    <div
      className="relative w-full mt-3 overflow-visible"
      style={{ height: `${ANIMATION_CONFIG.containerHeight}px` }}
      aria-live="polite"
    >
      {order.map((cardIndex, stackPosition) => {
        const cardText = items[cardIndex] ?? "";
        const isLeaving = isAnimating && stackPosition === 0;

        // During animation, cards 1-3 shift forward one position
        let scale: number;
        let y: number;
        let opacity: number;
        let filter: string;

        if (isLeaving) {
          scale = 1 + ANIMATION_CONFIG.scaleStep; // Slightly larger when leaving
          y = ANIMATION_CONFIG.translateStep;
          opacity = 0;
          filter = "blur(20px)";
        } else {
          const targetPos = isAnimating ? stackPosition - 1 : stackPosition;
          scale = 1 - targetPos * ANIMATION_CONFIG.scaleStep;
          y = -(targetPos * ANIMATION_CONFIG.translateStep);
          opacity = Math.max(0, 1 - targetPos * ANIMATION_CONFIG.opacityStep);
          filter = "blur(0px)";
        }

        const zIndex = isLeaving
          ? 5
          : isAnimating
            ? ANIMATION_CONFIG.stackLayers - (stackPosition - 1)
            : ANIMATION_CONFIG.stackLayers - stackPosition;

        return (
          <div
            key={`card-${cardIndex}-${stackPosition}`}
            className="absolute left-0 right-0 bottom-0 rounded-xl border-2 border-border bg-background px-6 py-6 flex flex-col justify-between gap-6 transition-all ease-out origin-bottom pointer-events-none"
            style={{
              transform: `scale(${scale}) translateY(${y}px)`,
              opacity,
              filter,
              zIndex,
              height: `${ANIMATION_CONFIG.cardHeight}px`,
              transitionDuration: `${ANIMATION_CONFIG.transitionDuration}ms`,
            }}
          >
            <OutcomeCardContent text={cardText} />
          </div>
        );
      })}

      {/* Entering card - rendered separately during animation */}
      <div
        key={`entering-${enteringCardIndex}`}
        className="absolute left-0 right-0 bottom-0 rounded-xl border-2 border-border bg-background px-6 py-6 flex flex-col justify-between gap-6 transition-all ease-out origin-bottom pointer-events-none"
        style={{
          transform: `scale(${
            isAnimating
              ? 1 - (ANIMATION_CONFIG.stackLayers - 1) * ANIMATION_CONFIG.scaleStep
              : 1 - ANIMATION_CONFIG.stackLayers * ANIMATION_CONFIG.scaleStep
          }) translateY(${
            isAnimating
              ? -(ANIMATION_CONFIG.stackLayers - 1) * ANIMATION_CONFIG.translateStep
              : -ANIMATION_CONFIG.stackLayers * ANIMATION_CONFIG.translateStep
          }px)`,
          opacity: isAnimating
            ? Math.max(0, 1 - (ANIMATION_CONFIG.stackLayers - 1) * ANIMATION_CONFIG.opacityStep)
            : 0,
          filter: "blur(0px)",
          zIndex: 0,
          height: `${ANIMATION_CONFIG.cardHeight}px`,
          transitionDuration: `${ANIMATION_CONFIG.transitionDuration}ms`,
        }}
      >
        <OutcomeCardContent text={items[enteringCardIndex] ?? ""} />
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
