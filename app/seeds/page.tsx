import type { Metadata } from "next";
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
