"use client";

import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { FolderOpen } from "lucide-react";
import Link from "next/link";
import pluralize from "pluralize";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { FundingMapCard } from "@/src/features/funding-map/components/funding-map-card";
import { FUNDING_PLATFORM_DOMAINS } from "@/src/features/funding-map/utils/funding-platform-domains";
import { mapFundingProgramToResponse } from "@/src/features/funding-map/utils/map-funding-program";
import { envVars } from "@/utilities/enviromentVars";
import { FUNDING_PLATFORM_PAGES, PAGES } from "@/utilities/pages";

interface LiveFundingOpportunitiesCarouselProps {
  programs: FundingProgram[];
}

function getProgramDetailUrl(
  communitySlug: string | undefined,
  programId: string | undefined
): string | null {
  if (!communitySlug || !programId) {
    return null;
  }

  const exclusiveDomain =
    FUNDING_PLATFORM_DOMAINS[communitySlug as keyof typeof FUNDING_PLATFORM_DOMAINS];
  const domain = exclusiveDomain
    ? envVars.isDev
      ? exclusiveDomain.dev
      : exclusiveDomain.prod
    : undefined;

  const pages = FUNDING_PLATFORM_PAGES(communitySlug, domain);
  return pages.PROGRAM_PAGE(programId);
}

export function LiveFundingOpportunitiesCarousel({
  programs,
}: LiveFundingOpportunitiesCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);

  // Map FundingProgram to FundingProgramResponse for FundingMapCard
  const mappedPrograms = useMemo(
    () => programs.map((program) => mapFundingProgramToResponse(program)),
    [programs]
  );

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

  // Empty state when there are no programs
  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-dashed border-border rounded-lg bg-muted/30">
        <div className="mb-4 p-3 rounded-full bg-muted">
          <FolderOpen className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-foreground">
          No Funding Programs Available
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          There are currently no live funding opportunities. Check back later or run your own
          funding program.
        </p>
        <Button
          variant="outline"
          className="border-border text-sm font-medium leading-[1.5] tracking-[0.005em] text-center align-middle text-foreground"
          asChild
        >
          <Link href={PAGES.FUNDERS}>Run a funding program</Link>
        </Button>
      </div>
    );
  }

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
        <CarouselContent className="-ml-2 md:-ml-4 flex items-stretch">
          {mappedPrograms.map((mappedProgram, index) => {
            const originalProgram = programs[index];
            const detailUrl = getProgramDetailUrl(
              originalProgram.communitySlug,
              originalProgram.programId
            );

            return (
              <CarouselItem
                key={`${originalProgram.programId}-${originalProgram.chainID}`}
                className="pl-2 md:pl-4 basis-full sm:basis-1/2 xl:basis-1/3 flex flex-col"
              >
                <FundingMapCard
                  program={mappedProgram}
                  hideDescription
                  hideCategories
                  onClick={
                    detailUrl
                      ? () => window.open(detailUrl, "_blank", "noopener,noreferrer")
                      : undefined
                  }
                  className="flex-1"
                />
              </CarouselItem>
            );
          })}
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
              {programs.length} {pluralize("funding program", programs.length)}
            </span>
          </div>
        </div>

        {/* Run a funding program button */}
        <Button
          variant="outline"
          className="border-border text-sm font-medium leading-[1.5] tracking-[0.005em] text-center align-middle text-foreground"
          asChild
        >
          <Link href={PAGES.FUNDERS}>Run a funding program</Link>
        </Button>
      </div>
    </>
  );
}
