import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

function FundingOpportunityCardSkeleton() {
    return (
        <Card className="h-full flex flex-col">
            <CardContent className="p-6 flex flex-col h-full">
                {/* Top section */}
                <div className="flex items-start justify-between mb-4">
                    <Skeleton className="h-5 w-32" />
                    <div className="text-right space-y-2">
                        <Skeleton className="h-5 w-16 ml-auto" />
                        <Skeleton className="h-3 w-12 ml-auto" />
                    </div>
                </div>

                {/* Title */}
                <div className="mb-4 flex-1 space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                </div>

                {/* Bottom section */}
                <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-9 w-24 rounded-md" />
                </div>
            </CardContent>
        </Card>
    );
}

export function LiveFundingOpportunitiesSkeleton() {
    return (
        <section className={cn(marketingLayoutTheme.padding, "py-16 w-full")}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h2 className={cn("section-title text-foreground")}>
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

            {/* Carousel with skeleton cards */}
            <Carousel
                opts={{
                    align: "start",
                    loop: false,
                }}
                className="w-full"
            >
                <CarouselContent className="-ml-2 md:-ml-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <CarouselItem
                            key={index}
                            className="pl-2 md:pl-4 basis-full sm:basis-1/2 xl:basis-1/3"
                        >
                            <FundingOpportunityCardSkeleton />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>

            {/* Navigation and Footer skeleton */}
            <div className="flex items-center justify-between mt-8">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-9 rounded-md" />
                        <Skeleton className="h-9 w-9 rounded-md" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                </div>
                <Skeleton className="h-10 w-40 rounded-md" />
            </div>
        </section>
    );
}

