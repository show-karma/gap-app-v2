import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { layoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";
import Image from "next/image";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { chosenCommunities } from "@/utilities/chosenCommunities";

interface MetricCard {
    type: "metric";
    metric: string;
    description: string;
    communitySlug: string;
}

interface TestimonialCard {
    type: "testimonial";
    text: string;
    author: string;
    authorRole: string;
    communitySlug: string;
    link?: string;
}

interface CaseStudyCard {
    type: "case-study";
    headline: string;
    description: string;
    communitySlug: string;
    link: string;
}

type CaseStudyCardType = MetricCard | TestimonialCard | CaseStudyCard;

const caseStudyCards: CaseStudyCardType[] = [
    {
        type: "metric",
        metric: "25hrs",
        description: "saved in grants setup",
        communitySlug: "celo"
    },
    {
        type: "testimonial",
        text: "Karma enabled us to do xyz which lead to xyz which lead to xyz which lead to xyz which lead to xyz which lead to xyz which lead to",
        author: "John Doe",
        authorRole: "Founder, Acme Inc.",
        communitySlug: "scroll"
    },
    {
        type: "case-study",
        headline: "Celo allocated $10m across their ecosystem",
        description: "Leverage AI to evaluate grant applications at scale.",
        communitySlug: "octant",
        link: "#"
    },
    {
        type: "case-study",
        headline: "Optimism saved hundreds of hours on application evaluation",
        description: "Leverage AI to evaluate grant applications at scale.",
        communitySlug: "optimism",
        link: "https://paragraph.com/@karmahq/optimism-grants-partners-with-karma-for-season-8"
    },
    {
        type: "metric",
        metric: "32%",
        description: "reduced admin burden",
        communitySlug: "arbitrum"
    },
    {
        type: "testimonial",
        text: "Over the past 10 months, Celo has leveraged Karma’s platform to track 400+ projects, 850+ grants and 3600+ milestones, moving from fragmented tracking to a unified onchain project registry and funding funnel to simplify impact measurement and grow their ecosystem.",
        author: "",
        authorRole: "",
        communitySlug: "celo",
        link: "https://paragraph.com/@karmahq/scaling-ecosystem-success-celo-case-study"
    }
];

function getCommunityImage(communitySlug: string): string | null {
    const communities = chosenCommunities(true);
    const community = communities.find((c) => c.slug === communitySlug);
    if (community) {
        return community.imageURL.light;
    }
    return null;
}

function MetricCardComponent({ card }: { card: MetricCard }) {
    const community = chosenCommunities(true).find((c) => c.slug === card.communitySlug);
    const imageUrl = getCommunityImage(card.communitySlug);

    return (
        <div className={cn(
            "flex flex-col justify-between",
            "h-[317px] w-full",
            "rounded-2xl border border-border bg-background p-5 shadow-sm"
        )}>
            {/* Metric Content */}
            <div className="flex flex-col gap-0">
                <div className={cn(
                    "text-foreground font-semibold",
                    "text-[48px] leading-[100%] tracking-[-0.01em]"
                )}>
                    {card.metric}
                </div>
                <div className={cn(
                    "text-foreground font-normal text-base",
                    "leading-[150%] tracking-[0%]"
                )}>
                    {card.description}
                </div>
            </div>

            {/* Community */}
            {community && imageUrl && (
                <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                            src={imageUrl}
                            alt={community.name}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <span className={cn(
                        "text-foreground font-bold text-sm",
                        "leading-5 tracking-[0%]"
                    )}>
                        {community.name}
                    </span>
                </div>
            )}
        </div>
    );
}

function TestimonialCardComponent({ card }: { card: TestimonialCard }) {
    const community = chosenCommunities(true).find((c) => c.slug === card.communitySlug);
    const imageUrl = getCommunityImage(card.communitySlug);

    return (
        <div className={cn(
            "flex flex-col justify-between",
            "h-[317px] w-full",
            "rounded-2xl border border-border bg-background p-5 shadow-sm"
        )}>
            {/* Testimonial Content */}
            <div className="flex flex-col gap-2">
                <p className={cn(
                    "text-foreground font-normal text-base",
                    "leading-[150%] tracking-[0%]"
                )}>
                    {card.text}
                </p>
                <div className="flex flex-col gap-0">
                    <span className={cn(
                        "text-muted-foreground font-semibold text-sm",
                        "leading-5 tracking-[0%]"
                    )}>
                        {card.author}
                    </span>
                    <span className={cn(
                        "text-muted-foreground font-medium text-sm",
                        "leading-5 tracking-[0%]"
                    )}>
                        {card.authorRole}
                    </span>
                </div>
            </div>

            {/* Bottom Section: Community and Button */}
            <div className="flex items-center justify-between gap-4">
                {/* Community */}
                {community && imageUrl ? (
                    <div className="flex items-center gap-2">
                        <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                                src={imageUrl}
                                alt={community.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <span className={cn(
                            "text-foreground font-bold text-sm",
                            "leading-5 tracking-[0%]"
                        )}>
                            {community.name}
                        </span>
                    </div>
                ) : (
                    <div />
                )}

                {/* Read Case Study Button */}
                {card.link && (
                    <ExternalLink href={card.link}>
                        <Button
                            variant="outline"
                            className={cn(
                                "border-border text-foreground",
                                "rounded-md font-medium"
                            )}
                        >
                            Read Case Study
                        </Button>
                    </ExternalLink>
                )}
            </div>
        </div>
    );
}

function CaseStudyCardComponent({ card }: { card: CaseStudyCard }) {
    const community = chosenCommunities(true).find((c) => c.slug === card.communitySlug);
    const imageUrl = getCommunityImage(card.communitySlug);

    return (
        <div className={cn(
            "flex flex-col justify-between",
            "h-[317px] w-full",
            "rounded-2xl border border-border bg-background p-8 shadow-sm"
        )}>
            {/* Case Study Content */}
            <div className="flex flex-col gap-3">
                {community && imageUrl && (
                    <div className="flex items-center gap-2">
                        <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                                src={imageUrl}
                                alt={community.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <span className={cn(
                            "text-foreground font-bold text-sm",
                            "leading-5 tracking-[0%]"
                        )}>
                            {community.name}
                        </span>
                    </div>
                )}
                <h3 className={cn(
                    "text-foreground font-semibold",
                    "text-[20px] leading-[120%] tracking-[-0.02em]"
                )}>
                    {card.headline}
                </h3>
                <p className={cn(
                    "text-muted-foreground font-medium text-sm",
                    "leading-5 tracking-[0%]"
                )}>
                    {card.description}
                </p>
            </div>

            {/* Button */}
            <div className="mt-auto">
                <ExternalLink href={card.link}>
                    <Button
                        variant="outline"
                        className={cn(
                            "border-border text-foreground",
                            "rounded-md font-medium"
                        )}
                    >
                        Read Case Study
                    </Button>
                </ExternalLink>
            </div>
        </div>
    );
}

export function CaseStudiesSection() {
    return (
        <section className={cn(
            layoutTheme.padding,
            "flex flex-col items-start w-full gap-16"
        )}
            id="case-studies"
        >
            {/* Header */}
            <div className="flex flex-col items-start gap-4 w-full">
                {/* Case Studies Pill */}
                <Badge
                    variant="secondary"
                    className={cn(
                        "text-secondary-foreground font-medium text-xs",
                        "leading-[150%] tracking-[0.015em]",
                        "rounded-full py-[3px] px-2",
                        "bg-secondary border-0 w-fit"
                    )}
                >
                    Case Studies
                </Badge>

                {/* Main Heading */}
                <h2 className={cn(
                    "font-semibold",
                    "text-[32px] leading-[36px] tracking-[-0.02em]",
                    "md:text-[40px] md:leading-[44px]",
                    "w-full"
                )}>
                    <span className="text-foreground">Ecosystems trust Karma</span>
                    <span className="text-muted-foreground"> to help them grow</span>
                </h2>
            </div>

            {/* Cards Grid */}
            <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full",
                "max-w-[1920px]"
            )}>
                {/* Card 1: Narrow (Row 1, Col 1) */}
                <div className="md:col-span-1">
                    <MetricCardComponent card={caseStudyCards[0] as MetricCard} />
                </div>

                {/* Card 2: Narrow (Row 1, Col 2) */}
                <div className="md:col-span-1">
                    <TestimonialCardComponent card={caseStudyCards[1] as TestimonialCard} />
                </div>

                {/* Card 3: Wide (Row 1, Col 3-4, spans 2 columns) */}
                <div className="md:col-span-2">
                    <CaseStudyCardComponent card={caseStudyCards[2] as CaseStudyCard} />
                </div>

                {/* Card 4: Wide (Row 2, Col 1-2, spans 2 columns) */}
                <div className="md:col-span-2">
                    <CaseStudyCardComponent card={caseStudyCards[3] as CaseStudyCard} />
                </div>

                {/* Card 5: Narrow (Row 2, Col 3) */}
                <div className="md:col-span-1">
                    <MetricCardComponent card={caseStudyCards[4] as MetricCard} />
                </div>

                {/* Card 6: Narrow (Row 2, Col 4) */}
                <div className="md:col-span-1">
                    <TestimonialCardComponent card={caseStudyCards[5] as TestimonialCard} />
                </div>
            </div>
        </section>
    );
}

