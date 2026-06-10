import type { Metadata } from "next";
import { CTASection } from "@/src/features/donor-advisors/components/cta-section";
import { FeaturesSection } from "@/src/features/donor-advisors/components/features-section";
import { Hero } from "@/src/features/donor-advisors/components/hero";
import { customMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = customMetadata({
  title: "For donors and advisors: Every brief shows the work behind the recommendation",
  description:
    "Karma Donor Research builds a ranked shortlist for any cause, geography, or grant size. Every pick gets a compliance check, an activity score, and a mission match, with the receipts attached.",
  path: "/donor-advisors",
});

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />;
};

export default function ForDonorsAdvisorsPage() {
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
