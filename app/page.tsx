import type { Metadata } from "next";
import { AudienceSwitcher } from "@/src/features/home/components/audience-switcher";
import { CTASection } from "@/src/features/home/components/cta-section";
import { Hero } from "@/src/features/home/components/hero";
import { customMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = {
  ...customMetadata({
    title: "Karma | Connecting funders to organizations worth backing",
    description:
      "One platform for foundations, donors, and nonprofits. Karma helps the right money reach the right organizations, and shows what happens next.",
    path: "/",
  }),
  title: {
    absolute: "Karma | Connecting funders to organizations worth backing",
  },
};

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%] border-0", className)} />;
};

export default function Index() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background overflow-x-hidden">
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-16 lg:gap-24">
        <Hero />
        <HorizontalLine className="max-w-full" />
        <AudienceSwitcher />
        <HorizontalLine />
        <CTASection />
      </div>
    </main>
  );
}
