import type { Metadata } from "next";
import { SeedsBenefits } from "@/src/features/seeds/components/benefits-section";
import { SeedsCTA } from "@/src/features/seeds/components/cta-section";
import { SeedsFAQ } from "@/src/features/seeds/components/faq-section";
import { SeedsHero } from "@/src/features/seeds/components/hero";
import { SeedsHowItWorks } from "@/src/features/seeds/components/how-it-works";
import { SeedsProjectsSection } from "@/src/features/seeds/components/projects-section";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = {
  title: "Karma Seeds - Tokenized Project Support | Karma GAP",
  description:
    "Support projects you believe in for just $1 per seed. Karma Seeds are ERC-20 tokens that give you on-chain proof of early backing.",
  keywords: [
    "karma seeds",
    "project support",
    "web3 funding",
    "ERC-20",
    "grants",
    "open source funding",
  ],
  openGraph: {
    title: "Karma Seeds - Plant Seeds. Grow Projects.",
    description: "Support projects at $1 per seed. 97% goes to builders.",
    url: "https://gap.karmahq.xyz/seeds",
    images: [{ url: "/og/seeds.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Karma Seeds - Tokenized Project Support",
    description: "Support projects at $1 per seed. Watch them grow.",
    images: ["/og/seeds.png"],
  },
};

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />;
};

export default function SeedsPage() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-16 lg:gap-24">
        <SeedsHero />
        <HorizontalLine className="max-w-full" />
        <SeedsHowItWorks />
        <HorizontalLine />
        <SeedsBenefits />
        <HorizontalLine />
        <SeedsProjectsSection />
        <HorizontalLine />
        <SeedsFAQ />
        <SeedsCTA />
      </div>
    </main>
  );
}
