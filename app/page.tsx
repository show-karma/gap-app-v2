import { defaultMetadata } from "@/utilities/meta";
import { Hero } from "@/src/features/homepage/components/hero";
import { LiveFundingOpportunities } from "@/src/features/homepage/components/live-funding-opportunities";
import { PlatformFeatures } from "@/src/features/homepage/components/platform-features";
import { HowItWorks } from "@/src/features/homepage/components/how-it-works";

export const metadata = defaultMetadata;

export default function Index() {
    return (
        <main className="flex w-full flex-col flex-1 items-center bg-background">
            <div className="flex w-full max-w-[1920px] flex-1 flex-col gap-2">
                <Hero />
                <LiveFundingOpportunities />
                <PlatformFeatures />
                <HowItWorks />
            </div>
        </main>
    );
}
