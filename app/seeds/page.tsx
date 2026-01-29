import type { Metadata } from "next";
import { SeedsBenefits } from "@/src/features/seeds/components/benefits-section";
import { SeedsCTA } from "@/src/features/seeds/components/cta-section";
import { SeedsFAQ } from "@/src/features/seeds/components/faq-section";
import { SeedsHero } from "@/src/features/seeds/components/hero";
import { SeedsHowItWorks } from "@/src/features/seeds/components/how-it-works";
import { SeedsProjectsSection } from "@/src/features/seeds/components/projects-section";

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

export default function SeedsPage() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background seeds-noise overflow-hidden">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="seeds-blob seeds-float absolute -top-32 -right-32 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-400/5 blur-3xl" />
        <div className="seeds-blob seeds-float-delayed absolute top-1/3 -left-48 w-80 h-80 bg-green-500/10 dark:bg-green-500/5 blur-3xl" />
        <div className="seeds-blob seeds-float-slow absolute bottom-1/4 right-0 w-72 h-72 bg-teal-400/10 dark:bg-teal-400/5 blur-3xl" />
      </div>

      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col relative z-10">
        <SeedsHero />

        {/* Organic divider */}
        <div className="w-full max-w-4xl px-8 my-12 md:my-16">
          <div className="seeds-line" />
        </div>

        <SeedsHowItWorks />

        <div className="w-full max-w-4xl px-8 my-12 md:my-16">
          <div className="seeds-line" />
        </div>

        <SeedsBenefits />

        <div className="w-full max-w-4xl px-8 my-12 md:my-16">
          <div className="seeds-line" />
        </div>

        <SeedsProjectsSection />

        <div className="w-full max-w-4xl px-8 my-12 md:my-16">
          <div className="seeds-line" />
        </div>

        <SeedsFAQ />
        <SeedsCTA />
      </div>
    </main>
  );
}
