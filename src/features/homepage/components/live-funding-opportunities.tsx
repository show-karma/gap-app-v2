import { FundingOpportunityCard } from "./funding-opportunity-card";
import { getLiveFundingOpportunities } from "@/src/services/funding/getLiveFundingOpportunities";
import { LiveFundingOpportunitiesCarousel } from "./live-funding-opportunities-carousel";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { layoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

export async function LiveFundingOpportunities() {
    const programs = await getLiveFundingOpportunities();

    return (
        <section id="live-funding-opportunities" className={cn(layoutTheme.padding, "py-16 w-full")}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-base font-medium leading-6 text-center text-muted-foreground">
                    Live Funding Opportunities
                </h2>
                <Link
                    href={PAGES.FUNDING_APP}
                    className="flex items-center gap-2 text-sm font-medium leading-[1.5] tracking-[0.005em] align-middle text-muted-foreground hover:text-primary transition-colors"
                >
                    View all
                    <ArrowRightIcon className="w-4 h-4" />
                </Link>
            </div>

            {/* Client component for interactive carousel */}
            <LiveFundingOpportunitiesCarousel programs={programs} />
        </section>
    );
}

