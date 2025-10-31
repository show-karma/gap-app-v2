"use client";

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
import pluralize from "pluralize";
import { useEffect, useState } from "react";
import type { FundingProgram } from "@/services/fundingPlatformService";

interface LiveFundingOpportunitiesCarouselProps {
    programs: FundingProgram[];
}

export function LiveFundingOpportunitiesCarousel({ programs }: LiveFundingOpportunitiesCarouselProps) {
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

    return (
        <>
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
                    {programs.map((program) => (
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
                            className="w-9 h-9 rounded-md border border-border bg-background shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                            aria-label="Previous"
                        >
                            <ArrowRightIcon className="w-4 h-4 rotate-180 text-foreground" />
                        </button>
                        <button
                            onClick={() => api?.scrollNext()}
                            disabled={current === totalSlides}
                            className="w-9 h-9 rounded-md border border-border bg-background shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
                            aria-label="Next"
                        >
                            <ArrowRightIcon className="w-4 h-4 text-foreground" />
                        </button>
                        <span className="text-sm font-medium leading-[1.5] tracking-[0.005em] text-muted-foreground">
                            {programs.length} {pluralize("Round", programs.length)}
                        </span>
                    </div>
                </div>

                {/* Run a funding program button */}
                <Button variant="outline" className="border-border text-sm font-medium leading-[1.5] tracking-[0.005em] text-center align-middle text-foreground" asChild>
                    <Link href={PAGES.FUNDERS}>
                        Run a funding program
                    </Link>
                </Button>
            </div>
        </>
    );
}

