"use client";

import { useLiveFundingOpportunities } from "@/hooks/useLiveFundingOpportunities";
import { FundingOpportunityCard } from "./funding-opportunity-card";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { homepageTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";
import pluralize from "pluralize";
import { useEffect, useState } from "react";

export function LiveFundingOpportunities() {
    const { data: programs = [], isLoading } = useLiveFundingOpportunities();
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);
    const [totalSlides, setTotalSlides] = useState(0);

    useEffect(() => {
        if (!api) {
            return;
        }

        // Get the total number of carousel slides/pages
        setTotalSlides(api.scrollSnapList().length);
        // Set initial current slide (1-indexed)
        setCurrent(api.selectedScrollSnap() + 1);

        // Listen for carousel slide changes and update current slide
        api.on("select", () => {
            setCurrent(api.selectedScrollSnap() + 1);
        });
    }, [api]);


    if (isLoading) {
        return (
            <section className={cn(homepageTheme.padding, "py-12 border-b border-border")}>
                <div className="flex items-center justify-center min-h-[400px]">
                    <p className="text-muted-foreground">Loading funding opportunities...</p>
                </div>
            </section>
        );
    }

    if (programs.length === 0) {
        return null;
    }

    return (
        <section className={cn(homepageTheme.padding, "py-12 border-b border-border")}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    Live Funding Opportunities
                </h2>
                <Link
                    href={PAGES.FUNDING_APP}
                    className="flex items-center gap-2 text-foreground hover:text-primary transition-colors text-sm font-medium"
                >
                    View all
                    <ArrowRightIcon className="w-4 h-4" />
                </Link>
            </div>

            {/* Carousel: Responsive - 1 card on mobile, 2 on tablet, 3 on desktop */}
            <Carousel
                setApi={setApi}
                opts={{
                    align: "start",
                    loop: false,
                }}
                className="w-full"
            >
                <CarouselContent className="-ml-2 md:-ml-4">
                    {programs.map((program, index) => (
                        <CarouselItem
                            key={`${program.programId}-${program.chainID}`}
                            className="pl-2 md:pl-4 basis-full sm:basis-1/2 xl:basis-1/3"
                        >
                            <FundingOpportunityCard program={program} />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {/* Carousel arrows are positioned below via custom buttons */}
                <CarouselPrevious className="hidden" />
                <CarouselNext className="hidden" />
            </Carousel>

            {/* Navigation and Footer */}
            <div className="flex items-center justify-between mt-8">
                <div className="flex items-center gap-4">
                    {/* Navigation controls - works on all screen sizes */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => api?.scrollPrev()}
                            disabled={current === 1}
                            className="w-8 h-8 rounded-md border border-border flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                            aria-label="Previous"
                        >
                            <ArrowRightIcon className="w-4 h-4 rotate-180" />
                        </button>
                        <button
                            onClick={() => api?.scrollNext()}
                            disabled={current === totalSlides}
                            className="w-8 h-8 rounded-md border border-border flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                            aria-label="Next"
                        >
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-muted-foreground">
                            {programs.length} {pluralize("Round", programs.length)}
                        </span>
                    </div>
                </div>

                {/* Run a funding program button */}
                <Button variant="outline" className="border-border" asChild>
                    {/* TODO: Add navigation functionality */}
                    <Link href={PAGES.REGISTRY.ADD_PROGRAM}>
                        Run a funding program
                    </Link>
                </Button>
            </div>
        </section>
    );
}

