"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

interface InfiniteSliderProps {
  items: {
    text: string;
    image: {
      light: string;
      dark: string;
    };
  }[];
  duration?: number;
  className?: string;
}

export function InfiniteSlider({ items, duration = 80, className }: InfiniteSliderProps) {
  const minItems = 15;
  const repetitions = Math.ceil(minItems / items.length);
  const extendedItems = Array(repetitions).fill(items).flat();

  const renderPill = (item: { text: string; image: { light: string; dark: string } }, index: number) => (
    <div
      key={index}
      className="flex items-center gap-2 px-2.5 py-2 mx-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 whitespace-nowrap text-sm font-medium text-zinc-700 dark:text-zinc-300"
    >
      <Image
        src={item.image.light}
        alt={item.text}
        width={24}
        height={24}
        className="block dark:hidden rounded-full w-6 h-6 object-cover"
      />
      <Image
        src={item.image.dark}
        alt={item.text}
        width={24}
        height={24}
        className="hidden dark:block rounded-full w-6 h-6 object-cover"
      />
      <span>{item.text}</span>
    </div>
  );

  return (
    <div className={cn("w-full overflow-hidden py-4 relative", className)}>
      {/* Left gradient fade - Light mode */}
      <div
        className="absolute left-0 top-0 bottom-0 w-6 lg:w-32 z-10 pointer-events-none block dark:hidden"
        style={{
          background: 'linear-gradient(to right, white 0%, transparent 100%)'
        }}
      />
      {/* Left gradient fade - Dark mode */}
      <div
        className="absolute left-0 top-0 bottom-0 w-6 lg:w-32 z-10 pointer-events-none hidden dark:block"
        style={{
          background: 'linear-gradient(to right, rgb(24, 24, 27) 0%, transparent 100%)'
        }}
      />

      <div
        className="flex"
        style={{
          width: "max-content",
          animation: `infiniteScroll ${duration}s linear infinite`
        }}
      >
        {/* First set */}
        {extendedItems.map((item, index) => renderPill(item, `first-${index}` as any))}

        {/* Second set for seamless loop */}
        {extendedItems.map((item, index) => renderPill(item, `second-${index}` as any))}
      </div>

      {/* Right gradient fade - Light mode */}
      <div
        className="absolute right-0 top-0 bottom-0 w-6 lg:w-32 z-10 pointer-events-none block dark:hidden"
        style={{
          background: 'linear-gradient(to left, white 0%, transparent 100%)'
        }}
      />
      {/* Right gradient fade - Dark mode */}
      <div
        className="absolute right-0 top-0 bottom-0 w-6 lg:w-32 z-10 pointer-events-none hidden dark:block"
        style={{
          background: 'linear-gradient(to left, rgb(24, 24, 27) 0%, transparent 100%)'
        }}
      />
    </div>
  );
}
