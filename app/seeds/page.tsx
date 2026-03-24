import type { Metadata } from "next";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { LaunchCTA } from "@/src/features/seeds/components/launch/launch-cta";
import { LaunchFAQ } from "@/src/features/seeds/components/launch/launch-faq";
import { LaunchHero } from "@/src/features/seeds/components/launch/launch-hero";
import { LaunchHowTo } from "@/src/features/seeds/components/launch/launch-how-to";
import { LaunchProblem } from "@/src/features/seeds/components/launch/launch-problem";
import { LaunchUseCases } from "@/src/features/seeds/components/launch/launch-use-cases";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Karma Seeds - Raise Funds Without Launching a Token",
  description:
    "Raise funds from your community without launching a token. Karma Seeds let you build community support, stay focused on building, and grow sustainably.",
  path: "/seeds",
  images: [
    {
      url: "/og/seeds.png",
      width: 1200,
      height: 630,
      alt: "Karma Seeds for your project",
    },
  ],
});

export default function SeedsPage() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background seeds-noise overflow-hidden">
      <FAQJsonLd
        questions={[
          {
            question: "What exactly are Karma Seeds?",
            answer:
              "Karma Seeds are ERC-20 tokens that represent $1 contributions to your project. For every dollar a supporter contributes, they receive one Seed. The funds go directly to your treasury address. Seeds are designed as receipts of support—not speculative tokens with price expectations.",
          },
          {
            question: "How do these seeds show up in buyer's wallet?",
            answer:
              "Karma Seeds are regular ERC-20 tokens. The name will be Karma Seeds - <Project Name> and code will be KSEED-<code>. You choose the name and code while creating Karma Seeds for your project.",
          },
          {
            question: "What are the fees?",
            answer:
              "There's a small platform fee that goes to Karma. The rest goes directly to your treasury address. No hidden costs, no ongoing fees.",
          },
          {
            question: "How do I receive the funds?",
            answer:
              "When you launch Seeds, you specify a treasury wallet address. All contributions go directly to that address—you have full control. You can use any wallet address you control, including a multisig or DAO treasury.",
          },
          {
            question: "Do I have any obligations to Seed holders?",
            answer:
              "Seeds come with no built-in obligations. They're receipts of support, not governance tokens or equity. However, many projects choose to reward their Seed holders with early access, rev share, or token allocations later. What you do is entirely up to you.",
          },
          {
            question: "What if I want to launch a real token later?",
            answer:
              "Seeds are designed to be compatible with future token launches. You can use your Seed holder list to reward early supporters—whether that's through early access, rev share, or token allocations. Seeds keep your options open without forcing a decision.",
          },
          {
            question: "Can I change the price per Seed?",
            answer:
              "Seeds are fixed at $1 by design. This simplicity is intentional—it removes the speculation and price discovery that comes with variable pricing. One dollar, one Seed, always.",
          },
          {
            question: "Can I launch Seeds for multiple projects?",
            answer:
              "Each project on Karma can have its own Seeds. If you have multiple projects, each gets its own token with its own treasury. Supporters can choose which specific project they want to back.",
          },
          {
            question: "Can I stop accepting Seeds?",
            answer:
              "Yes, you can pause or disable Seeds for your project at any time through your dashboard. Existing Seeds remain valid—they're tokens in your supporters' wallets. But new purchases can be stopped.",
          },
        ]}
      />
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="seeds-blob seeds-float absolute -top-32 -left-32 w-96 h-96 bg-seeds-300/10 dark:bg-seeds-300/5 blur-3xl" />
        <div className="seeds-blob seeds-float-delayed absolute top-1/2 -right-48 w-80 h-80 bg-seeds-300/10 dark:bg-seeds-300/5 blur-3xl" />
        <div className="seeds-blob seeds-float-slow absolute bottom-1/3 left-1/4 w-72 h-72 bg-seeds-300/10 dark:bg-seeds-300/5 blur-3xl" />
      </div>

      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col relative z-10">
        <LaunchHero />

        {/* Organic divider */}
        <div className="w-full max-w-4xl px-8 my-12 md:my-16">
          <div className="seeds-line" />
        </div>

        <LaunchProblem />

        <div className="w-full max-w-4xl px-8 my-12 md:my-16">
          <div className="seeds-line" />
        </div>

        <LaunchUseCases />

        <div className="w-full max-w-4xl px-8 my-12 md:my-16">
          <div className="seeds-line" />
        </div>

        <LaunchHowTo />

        <div className="w-full max-w-4xl px-8 my-12 md:my-16">
          <div className="seeds-line" />
        </div>

        <LaunchFAQ />
        <LaunchCTA />
      </div>
    </main>
  );
}
