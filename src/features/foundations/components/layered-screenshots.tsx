"use client";

import { ThemeImage } from "@/src/components/ui/theme-image";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { cn } from "@/utilities/tailwind";

interface LayeredScreenshotsProps {
  className?: string;
  front?: { src: string; alt: string; width: number; height: number };
  back?: { src: string; alt: string; width: number; height: number };
  /** Disable scroll reveal when used inside an already-animated container. */
  staticAppear?: boolean;
  /** Set true when the images don't ship a `-drk` dark-mode variant. */
  disableDarkMode?: boolean;
}

const defaultFront = {
  src: "/images/homepage/funder-benefit-01.png",
  alt: "Karma application evaluation dashboard",
  width: 720,
  height: 450,
};

const defaultBack = {
  src: "/images/homepage/funder-benefit-02.png",
  alt: "Karma project registry",
  width: 720,
  height: 450,
};

export function LayeredScreenshots({
  className,
  front = defaultFront,
  back = defaultBack,
  staticAppear = false,
  disableDarkMode = false,
}: LayeredScreenshotsProps) {
  const BackBlock = (
    <div className="w-[75%] ml-auto rounded-xl overflow-hidden border border-border shadow-md bg-background">
      <ThemeImage
        src={back.src}
        alt={back.alt}
        width={back.width}
        height={back.height}
        disableDarkMode={disableDarkMode}
        className="w-full h-auto"
      />
    </div>
  );

  const FrontBlock = (
    <div className="w-[75%] -mt-[30%] relative z-10 rounded-xl overflow-hidden border border-border shadow-xl bg-background">
      <ThemeImage
        src={front.src}
        alt={front.alt}
        width={front.width}
        height={front.height}
        disableDarkMode={disableDarkMode}
        className="w-full h-auto"
      />
    </div>
  );

  return (
    <div className={cn("w-full max-w-[960px] mx-auto relative", className)}>
      {staticAppear ? (
        BackBlock
      ) : (
        <ScrollReveal variant="fade-up" delay={250} duration={900}>
          {BackBlock}
        </ScrollReveal>
      )}
      {staticAppear ? (
        FrontBlock
      ) : (
        <ScrollReveal variant="fade-up" delay={150} duration={900}>
          {FrontBlock}
        </ScrollReveal>
      )}
    </div>
  );
}
