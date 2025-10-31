"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type TestimonialItem = {
  quote: string;
  name: string;
  title?: string;
  avatar?: string;
};

type PillItem = {
  text: string;
  image: {
    light: string;
    dark: string;
  };
  href?: string;
};

type InfiniteMovingCardsProps = {
  items: TestimonialItem[] | PillItem[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  className?: string;
  variant?: "card" | "pill";
};

export const InfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
  variant = "card",
}: InfiniteMovingCardsProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLUListElement>(null);

  useEffect(() => {
    addAnimation();
  }, []);
  const [start, setStart] = useState(false);
  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      getDirection();
      getSpeed();
      setStart(true);
    }
  }
  const getDirection = () => {
    if (containerRef.current) {
      if (direction === "left") {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "forwards",
        );
      } else {
        containerRef.current.style.setProperty(
          "--animation-direction",
          "reverse",
        );
      }
    }
  };
  const getSpeed = () => {
    if (containerRef.current) {
      if (speed === "fast") {
        containerRef.current.style.setProperty("--animation-duration", "20s");
      } else if (speed === "normal") {
        containerRef.current.style.setProperty("--animation-duration", "40s");
      } else {
        containerRef.current.style.setProperty("--animation-duration", "80s");
      }
    }
  };
  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] dark:[mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className,
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex w-max min-w-full shrink-0 flex-nowrap py-4",
          variant === "card" ? "gap-8" : "gap-2",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]",
        )}
      >
        {items.map((item, idx) => {
          if (variant === "pill") {
            const pillItem = item as PillItem;
            const content = (
              <>
                <Image
                  src={pillItem.image.light}
                  alt={pillItem.text}
                  width={24}
                  height={24}
                  className="block dark:hidden rounded-full w-6 h-6 object-cover"
                />
                <Image
                  src={pillItem.image.dark}
                  alt={pillItem.text}
                  width={24}
                  height={24}
                  className="hidden dark:block rounded-full w-6 h-6 object-cover"
                />
                <span>{pillItem.text}</span>
              </>
            );

            return (
              <li
                key={`pill-${idx}`}
                className="shrink-0"
              >
                {pillItem.href ? (
                  <Link
                    href={pillItem.href}
                    className="flex items-center gap-2 px-2.5 py-2 mx-2 rounded-full bg-background border border-border whitespace-nowrap text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 px-2.5 py-2 mx-2 rounded-full bg-background border border-border whitespace-nowrap text-sm font-medium text-muted-foreground">
                    {content}
                  </div>
                )}
              </li>
            );
          }

          // Card variant (testimonials)
          const cardItem = item as TestimonialItem;
          return (
            <li
              className="relative w-[320px] max-w-full shrink-0 rounded-xl border border-b-0 bg-secondary px-6 py-6"
              key={`${cardItem.name}-${idx}`}
            >
              <blockquote>
                <div
                  aria-hidden="true"
                  className="user-select-none pointer-events-none absolute -top-0.5 -left-0.5 -z-1 h-[calc(100%_+_4px)] w-[calc(100%_+_4px)]"
                ></div>
                <span className="relative z-20 text-base leading-6 font-medium text-foreground">
                  {cardItem.quote}
                </span>
                <div className="relative z-20 mt-4 flex flex-row items-center gap-3">
                  {cardItem.avatar && (
                    <Image
                      src={cardItem.avatar}
                      alt={cardItem.name}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="flex flex-col gap-0">
                    <span className="text-base leading-6 font-semibold text-muted-foreground">
                      {cardItem.name}
                    </span>
                    {cardItem.title && (
                      <span className="text-sm leading-5 font-normal text-muted-foreground">
                        {cardItem.title}
                      </span>
                    )}
                  </span>
                </div>
              </blockquote>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
