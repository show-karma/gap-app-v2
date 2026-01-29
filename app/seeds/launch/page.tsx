import type { Metadata } from "next";
import { LaunchCTA } from "@/src/features/seeds/components/launch/launch-cta";
import { LaunchFAQ } from "@/src/features/seeds/components/launch/launch-faq";
import { LaunchHero } from "@/src/features/seeds/components/launch/launch-hero";
import { LaunchHowTo } from "@/src/features/seeds/components/launch/launch-how-to";
import { LaunchProblem } from "@/src/features/seeds/components/launch/launch-problem";
import { LaunchUseCases } from "@/src/features/seeds/components/launch/launch-use-cases";
import { cn } from "@/utilities/tailwind";

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

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />;
};

export default function SeedsLaunchPage() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-16 lg:gap-24">
        <LaunchHero />
        <HorizontalLine className="max-w-full" />
        <LaunchProblem />
        <HorizontalLine />
        <LaunchUseCases />
        <HorizontalLine />
        <LaunchHowTo />
        <HorizontalLine />
        <LaunchFAQ />
        <LaunchCTA />
      </div>
    </main>
  );
}
