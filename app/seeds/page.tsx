import type { Metadata } from "next";
import { CtaSection } from "@/src/features/seeds/components/cta-section";
import { FeeStructure } from "@/src/features/seeds/components/fee-structure";
import { Hero } from "@/src/features/seeds/components/hero";
import { WhySimple } from "@/src/features/seeds/components/technical-overview";
import { CoreHypotheses } from "@/src/features/seeds/components/use-cases";
import { WhatAreSeeds } from "@/src/features/seeds/components/what-are-seeds";
import { WhatWeDontKnow } from "@/src/features/seeds/components/what-we-dont-know";
import { WhyKarmaSeeds } from "@/src/features/seeds/components/why-karma-seeds";
import { WhySeedsNaming } from "@/src/features/seeds/components/why-seeds-naming";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = {
  title: "Karma Seeds - A Simple Building Block for Funding | Karma",
  description:
    "A $1 receipt for supporting projects. No speculation, no volatility. Just transparent, on-chain support for open source and public goods.",
  openGraph: {
    title: "Karma Seeds - A Simple Building Block for Funding",
    description:
      "A $1 receipt for supporting projects. No speculation, no volatility. Just transparent, on-chain support for open source and public goods.",
  },
};

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />;
};

export default function SeedsPage() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-2">
        <Hero />
        <HorizontalLine className="max-w-full" />
        <WhyKarmaSeeds />
        <HorizontalLine />
        <WhatAreSeeds />
        <HorizontalLine />
        <WhySeedsNaming />
        <HorizontalLine />
        <WhySimple />
        <HorizontalLine />
        <CoreHypotheses />
        <HorizontalLine />
        <WhatWeDontKnow />
        <HorizontalLine />
        <FeeStructure />
        <HorizontalLine />
        <CtaSection />
      </div>
    </main>
  );
}
