import type { Metadata } from "next";
import { CTASection } from "@/src/features/for-nonprofits/components/cta-section";
import { FeaturesSection } from "@/src/features/for-nonprofits/components/features-section";
import { Hero } from "@/src/features/for-nonprofits/components/hero";
import { customMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = customMetadata({
  title: "For Nonprofits: Get found by the funders looking for you",
  description:
    "Karma gives nonprofits a live profile that foundations and donors actually search, plus a way to show what funding produced, not just what you're asking for next.",
  path: "/for-nonprofits",
});

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />;
};

export default function ForNonprofitsPage() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-16 lg:gap-24">
        <Hero />
        <HorizontalLine className="max-w-full" />
        <FeaturesSection />
        <CTASection />
      </div>
    </main>
  );
}
