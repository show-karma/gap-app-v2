import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/UI/button";
import { SOCIALS } from "@/utilities/socials";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { InfiniteMovingCards } from "@/src/components/ui/infinite-moving-cards";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { marketingLayoutTheme } from "@/src/helper/theme";

export function Hero() {
    const communityItems = chosenCommunities(true).map((community) => ({
        text: community.name,
        image: community.imageURL,
        href: PAGES.COMMUNITY.ALL_GRANTS(community.slug),
    }));

    return (
        <section className={cn(
            marketingLayoutTheme.padding,
            "flex flex-col items-center md:items-center gap-6 md:gap-8 lg:gap-10 w-full pt-16 md:pt-24",
        )}>
            {/* Free Guide Banner Section */}
            <div className="w-full hidden md:flex justify-start md:justify-center" />

            {/* Main Heading Section */}
            <h1 className={cn(
                "text-foreground font-semibold text-[40px] md:text-5xl lg:text-[48px]",
                "leading-none tracking-[-0.02em]",
                "text-left md:text-center max-w-[768px] w-full md:mx-auto"
            )}>
                Grow your ecosystem with a world-class funding platform
            </h1>

            {/* Description Section */}
            <p className={cn(
                "text-muted-foreground font-medium text-base md:text-xl",
                "leading-[150%] md:leading-[30px] text-left md:text-center",
                "max-w-[768px] w-full md:mx-auto"
            )}>
                From intake to impact, Karma gives you the tools to fund smarter, track progress transparently, and maximize the ROI of every funded project.
            </p>

            {/* Schedule Demo Button Section */}
            <div className="w-full flex justify-start md:justify-center max-w-[768px] md:mx-auto">
                <Button
                    asChild
                    className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium px-6 py-2.5"
                >
                    <Link href={SOCIALS.PARTNER_FORM} target="_blank" rel="noopener noreferrer">
                        Schedule Demo
                    </Link>
                </Button>
            </div>

            {/* Trusted Communities Section */}
            <div className="flex flex-col items-start md:items-center gap-4 w-full">
                <div className="w-full -mx-4 md:-mx-8 flex flex-row items-center justify-center">
                    <InfiniteMovingCards
                        items={communityItems}
                        variant="pill"
                        direction="left"
                        speed="slow"
                        pauseOnHover
                        className="w-full"
                    />
                </div>

                <p className="text-muted-foreground font-medium text-base leading-[150%] text-center">
                    Trusted by growing ecosystems
                </p>
            </div>
        </section>
    );
}
