import { Suspense } from "react"
import { FAQ } from "@/src/features/homepage/components/faq"
import { Hero } from "@/src/features/homepage/components/hero"
import { HowItWorks } from "@/src/features/homepage/components/how-it-works"
import { JoinCommunity } from "@/src/features/homepage/components/join-community"
import { LiveFundingOpportunities } from "@/src/features/homepage/components/live-funding-opportunities"
import { LiveFundingOpportunitiesSkeleton } from "@/src/features/homepage/components/live-funding-opportunities-skeleton"
import { PlatformFeatures } from "@/src/features/homepage/components/platform-features"
import { WhereBuildersGrow } from "@/src/features/homepage/components/where-builders-grow"
import { defaultMetadata } from "@/utilities/meta"
import { cn } from "@/utilities/tailwind"

export const metadata = defaultMetadata

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />
}

export default function Index() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-2">
        <Hero />
        <HorizontalLine className="max-w-full" />
        <Suspense fallback={<LiveFundingOpportunitiesSkeleton />}>
          <LiveFundingOpportunities />
        </Suspense>
        <HorizontalLine />
        <PlatformFeatures />
        <HorizontalLine />
        <HowItWorks />
        <HorizontalLine />
        <JoinCommunity />
        <HorizontalLine />
        <FAQ />
        <HorizontalLine />
        <WhereBuildersGrow />
      </div>
    </main>
  )
}
