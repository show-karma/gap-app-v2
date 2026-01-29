import type { Metadata } from "next";
import { LaunchCTA } from "@/src/features/seeds/components/launch/launch-cta";
import { LaunchFAQ } from "@/src/features/seeds/components/launch/launch-faq";
import { LaunchHero } from "@/src/features/seeds/components/launch/launch-hero";
import { LaunchHowTo } from "@/src/features/seeds/components/launch/launch-how-to";
import { LaunchProblem } from "@/src/features/seeds/components/launch/launch-problem";
import { LaunchUseCases } from "@/src/features/seeds/components/launch/launch-use-cases";

export const metadata: Metadata = {
  title: "Launch Karma Seeds for Your Project | Karma GAP",
  description:
    "Raise funds from your community without launching a token. Karma Seeds let you build community and stay focused on building.",
  openGraph: {
    title: "Launch Karma Seeds - Accept Support Without a Token",
    description:
      "Raise funds from your community at $1 per seed. No token economics, no speculation—just transparent funding that goes to your treasury.",
    url: "https://gap.karmahq.xyz/seeds/launch",
    images: [
      {
        url: "/og/seeds-launch.png",
        width: 1200,
        height: 630,
        alt: "Launch Karma Seeds for your project",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Launch Karma Seeds for Your Project",
    description: "Raise funds without launching a token. Funds go directly to your treasury.",
    images: ["/og/seeds-launch.png"],
  },
};

export default function SeedsLaunchPage() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background seeds-noise overflow-hidden">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="seeds-blob seeds-float absolute -top-32 -left-32 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-400/5 blur-3xl" />
        <div className="seeds-blob seeds-float-delayed absolute top-1/2 -right-48 w-80 h-80 bg-green-500/10 dark:bg-green-500/5 blur-3xl" />
        <div className="seeds-blob seeds-float-slow absolute bottom-1/3 left-1/4 w-72 h-72 bg-teal-400/10 dark:bg-teal-400/5 blur-3xl" />
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
