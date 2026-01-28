import type { Metadata } from "next";
import { CtaSection } from "@/src/features/seeds/components/cta-section";
import { FeeStructure } from "@/src/features/seeds/components/fee-structure";
import { Hero } from "@/src/features/seeds/components/hero";
import { HowItWorks } from "@/src/features/seeds/components/how-it-works";
import { TechnicalOverview } from "@/src/features/seeds/components/technical-overview";
import { UseCases } from "@/src/features/seeds/components/use-cases";
import { WhyKarmaSeeds } from "@/src/features/seeds/components/why-karma-seeds";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = {
  title: "Karma Seeds - A Modern Way to Support Open Source | Karma",
  description:
    "Fund open source projects and public goods with stable, dollar-pegged tokens. 97% goes directly to project treasuries. No speculation, no volatility.",
  openGraph: {
    title: "Karma Seeds - A Modern Way to Support Open Source",
    description:
      "Fund open source projects and public goods with stable, dollar-pegged tokens. 97% goes directly to project treasuries. No speculation, no volatility.",
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
        <UseCases />
        <HorizontalLine />
        <FeeStructure />
        <HorizontalLine />
        <TechnicalOverview />
        <HorizontalLine />
        <CtaSection />
      </div>
    </main>
  );
}
