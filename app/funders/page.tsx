import { CaseStudiesSection } from "@/src/features/funders/components/case-studies-section"
import { FAQSection } from "@/src/features/funders/components/faq-section"
import { HandleTheVisionSection } from "@/src/features/funders/components/handle-the-vision-section"
import { Hero } from "@/src/features/funders/components/hero"
import { HowItWorksSection } from "@/src/features/funders/components/how-it-works-section"
import { NumbersSection } from "@/src/features/funders/components/numbers-section"
import { OfferingSection } from "@/src/features/funders/components/offering-section"
import { PlatformSection } from "@/src/features/funders/components/platform-section"
import { cn } from "@/utilities/tailwind"

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />
}

export default function FundersPage() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-16 lg:gap-24">
        <Hero />
        <HorizontalLine className="max-w-full" />
        <NumbersSection />
        <HorizontalLine />
        <PlatformSection />
        <HorizontalLine />
        <CaseStudiesSection />
        <HorizontalLine />
        <HowItWorksSection />
        <HorizontalLine />
        <OfferingSection />
        <HorizontalLine />
        <FAQSection />
        <HandleTheVisionSection />
      </div>
    </main>
  )
}
