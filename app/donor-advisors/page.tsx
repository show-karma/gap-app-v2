import type { Metadata } from "next";
import { CTASection } from "@/src/features/donor-advisors/components/cta-section";
import { FeaturesSection } from "@/src/features/donor-advisors/components/features-section";
import { Hero } from "@/src/features/donor-advisors/components/hero";
import { customMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = customMetadata({
  title: "For donor advisors: Generate a donor-ready research brief in 10 minutes",
  description:
    "Donor advisors use Karma Nonprofit Research to build a ranked shortlist for any cause, geography, or grant size. Compliance, activity, and mission match arrive already verified, so you save hours of diligence and hand donors a recommendation they can act on.",
  path: "/donor-advisors",
});

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />;
};

export default function DonorAdvisorsPage() {
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
