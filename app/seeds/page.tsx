import type { Metadata } from "next";
import { CtaSection } from "@/src/features/seeds/components/cta-section";
import { FeeStructure } from "@/src/features/seeds/components/fee-structure";
import { Hero } from "@/src/features/seeds/components/hero";
import { HowItWorks } from "@/src/features/seeds/components/how-it-works";
import { WhyKarmaSeeds } from "@/src/features/seeds/components/why-karma-seeds";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = {
  title: "Karma Seeds - Fund Projects with Stable Tokens | Karma",
  description:
    "A new way to support open source and public goods. Fixed $1 price, no volatility, 97% goes directly to project treasuries.",
  openGraph: {
    title: "Karma Seeds - Fund Projects with Stable Tokens",
    description:
      "A new way to support open source and public goods. Fixed $1 price, no volatility, 97% goes directly to project treasuries.",
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
        <HowItWorks />
        <HorizontalLine />
        <FeeStructure />
        <HorizontalLine />
        <CtaSection />
      </div>
    </main>
  );
}
