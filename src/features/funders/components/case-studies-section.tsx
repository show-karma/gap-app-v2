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
    communitySlugs?: string[];
}

interface TestimonialCard {
    type: "testimonial";
    text: string;
    author: string;
    authorRole: string;
    communitySlug: string;
    link?: string;
    avatar?: string;
}

interface CaseStudyCard {
    type: "case-study";
    headline: string;
    description: string;
    communitySlug: string;
    link?: string;
    author?: string;
    authorRole?: string;
}

type CaseStudyCardType = MetricCard | TestimonialCard | CaseStudyCard;

const caseStudyCards: CaseStudyCardType[] = [
    {
        type: "metric",
        metric: "700",
        description: "AI evaluations shared in the last 30 days",
        communitySlug: "",
        communitySlugs: ["optimism", "celo", "scroll"]
    },
    {
        type: "testimonial",
        text: "Karma isn't just software, they're a true partner. Their AI-driven evaluations cut review time dramatically. Their platform fits our needs perfectly and their team ships features at lightning speed.",
        author: "Gonna",
        authorRole: "Optimism Grants Council Lead",
        communitySlug: "optimism",
        avatar: "/images/homepage/gonna.png"
    },
    {
        type: "testimonial",
        text: "Karma has been a valuable partner in helping us grow and support the Celo developer community. Their tools made it easy to recognize contributor impact and run more transparent, data-driven DevRel programs. The team has also been great to work with – responsive, thoughtful, and always looking for ways to improve.",
        author: "Sophia Dew",
        authorRole: "Celo Devrel Lead",
        communitySlug: "celo",
        avatar: "/images/homepage/sophia-dew.png"
    },
    {
        type: "case-study",
        headline: "Optimism saved hundreds of hours on application evaluation",
        description: "Leverage AI to evaluate grant applications at scale.",
        communitySlug: "optimism",
        link: "https://paragraph.com/@karmahq/optimism-grants-partners-with-karma-for-season-8"
    },
    {
        type: "case-study",
        headline: "3,600+ Milestones completed by Celo grant recipients in 10 months",
        description: "Over the past 10 months, Celo has leveraged Karma's platform to track 400+ projects, 850+ grants and 3600+ milestones, moving from fragmented tracking to a unified onchain project registry and funding funnel to simplify impact measurement and grow their ecosystem.",
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
    const communities = card.communitySlugs
        ? card.communitySlugs.map(slug => {
            const community = chosenCommunities(true).find((c) => c.slug === slug);
            const imageUrl = getCommunityImage(slug);
            return { community, imageUrl };
        }).filter(item => item.community && item.imageUrl)
        : [];

    return (
        <div className={cn(
            "flex flex-col justify-between",
            "min-h-[317px] h-full w-full",
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
                    "text-foreground font-normal text-sm",
                    "leading-[150%] tracking-[0%]"
                )}>
                    {card.description}
                </div>
            </div>

            {/* Communities */}
            {communities.length > 0 && (
                <div className="flex items-center gap-2">
                    {communities.map(({ community, imageUrl }, index) => (
                        <div key={index} className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                                src={imageUrl!}
                                alt={community!.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TestimonialCardComponent({ card, isSecondCard }: { card: TestimonialCard; isSecondCard?: boolean }) {
    const community = chosenCommunities(true).find((c) => c.slug === card.communitySlug);
    const imageUrl = getCommunityImage(card.communitySlug);

    if (isSecondCard) {
        // Gonna card: quote and text in one column, separated by 32px
        return (
            <div className={cn(
                "flex flex-col justify-between",
                "min-h-[317px] h-full w-full",
                "p-5"
            )}>
                {/* Testimonial Content */}
                <div className="flex flex-col justify-between h-full gap-8">
                    {/* Quote and text container - stacked vertically */}
                    <div className="flex flex-col gap-8">
                        {/* Quote mark */}
                        <span className={cn(
                            "text-foreground",
                            "font-semibold text-[40px] leading-[44px] tracking-[-0.02em]"
                        )}>
                            "
                        </span>
                        {/* Text */}
                        <p className={cn(
                            "text-foreground font-normal text-sm",
                            "leading-[150%] tracking-[0%]"
                        )}>
                            {card.text}
                        </p>
                    </div>
                    {/* Author section */}
                    {(card.author || card.authorRole) && (
                        <div className="flex items-center gap-2">
                            {card.avatar && (
                                <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                    <Image
                                        src={card.avatar}
                                        alt={card.author}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}
                            <div className="flex flex-col gap-0">
                                {card.author && (
                                    <span className={cn(
                                        "text-muted-foreground font-semibold text-sm",
                                        "leading-5 tracking-[0%]"
                                    )}>
                                        {card.author}
                                    </span>
                                )}
                                {card.authorRole && (
                                    <span className={cn(
                                        "text-muted-foreground font-medium text-sm",
                                        "leading-5 tracking-[0%]"
                                    )}>
                                        {card.authorRole}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 5th card (Sophia Dew): quote and text in div with gap-32px, justify-between to author section
    return (
        <div className={cn(
            "flex flex-col justify-between",
            "min-h-[317px] h-full w-full",
            "p-5"
        )}>
            {/* Testimonial Content */}
            <div className="flex flex-col justify-between h-full gap-8">
                {/* Quote and text container */}
                <div className="flex flex-col">
                    <p className={cn(
                        "text-foreground font-normal text-sm",
                        "leading-[150%] tracking-[0%]",
                        "relative pl-6"
                    )}>
                        <span className={cn(
                            "text-foreground",
                            "font-semibold text-[40px] leading-[44px] tracking-[-0.02em]",
                            "absolute left-0 top-0"
                        )}>
                            "
                        </span>
                        {card.text}
                    </p>
                </div>
                {/* Author section - center aligned, avatar and name together, role on next row */}
                {(card.author || card.authorRole) && (
                    <div className="flex flex-col items-center gap-0">
                        <div className="flex items-center gap-2">
                            {card.avatar && (
                                <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                    <Image
                                        src={card.avatar}
                                        alt={card.author}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}
                            {card.author && (
                                <span className={cn(
                                    "text-muted-foreground font-semibold text-sm",
                                    "leading-5 tracking-[0%]"
                                )}>
                                    {card.author}
                                </span>
                            )}
                        </div>
                        {card.authorRole && (
                            <span className={cn(
                                "text-muted-foreground font-medium text-sm",
                                "leading-5 tracking-[0%]"
                            )}>
                                {card.authorRole}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function CaseStudyCardComponent({ card, hasShadowMd }: { card: CaseStudyCard; hasShadowMd?: boolean }) {
    const community = chosenCommunities(true).find((c) => c.slug === card.communitySlug);
    const imageUrl = getCommunityImage(card.communitySlug);

    return (
        <div className={cn(
            "flex flex-col justify-between",
            "min-h-[317px] h-full w-full",
            "rounded-2xl border border-border bg-background p-5",
            hasShadowMd ? "shadow-md" : "shadow-sm"
        )}>
            {/* Case Study Content */}
            <div className="flex flex-col gap-3">
                {card.headline && (
                    <h3 className={cn(
                        "text-foreground font-semibold",
                        "text-[20px] leading-[120%] tracking-[-0.02em]"
                    )}>
                        {card.headline}
                    </h3>
                )}
                <p className={cn(
                    "text-foreground font-normal text-sm",
                    "leading-[150%] tracking-[0%]"
                )}>
                    {card.description}
                </p>
                {(card.author || card.authorRole) && (
                    <div className="flex flex-col gap-0">
                        {card.author && (
                            <span className={cn(
                                "text-muted-foreground font-semibold text-sm",
                                "leading-5 tracking-[0%]"
                            )}>
                                {card.author}
                            </span>
                        )}
                        {card.authorRole && (
                            <span className={cn(
                                "text-muted-foreground font-medium text-sm",
                                "leading-5 tracking-[0%]"
                            )}>
                                {card.authorRole}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Section: Community and Button */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
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
                {card.link ? <ExternalLink href={card.link}>
                    <Button
                        variant="outline"
                        className={cn(
                            "border-border text-foreground",
                            "rounded-md font-medium"
                        )}
                    >
                        Read Case Study
                    </Button>
                </ExternalLink> : null}
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
                "grid grid-cols-1 md:grid-cols-6 gap-4 w-full",
                "max-w-[1920px]",
                "items-stretch"
            )}>
                {/* Row 1: 2-2-2 layout */}
                {/* Card 1: Metric "700" (Row 1, Col 1-2) */}
                <div className="md:col-span-2">
                    <MetricCardComponent card={caseStudyCards[0] as MetricCard} />
                </div>

                {/* Card 2: Gonna Testimonial (Row 1, Col 3-4) */}
                <div className="md:col-span-2">
                    <TestimonialCardComponent card={caseStudyCards[1] as TestimonialCard} isSecondCard={true} />
                </div>

                {/* Card 3: Celo 3,600+ Milestones Case Study (Row 1, Col 5-6) */}
                <div className="md:col-span-2">
                    <CaseStudyCardComponent card={caseStudyCards[4] as CaseStudyCard} hasShadowMd={true} />
                </div>

                {/* Row 2: 3-3 layout */}
                {/* Card 4: Optimism Case Study (Row 2, Col 1-3) */}
                <div className="md:col-span-3">
                    <CaseStudyCardComponent card={caseStudyCards[3] as CaseStudyCard} hasShadowMd={true} />
                </div>

                {/* Card 5: Sophia Dew Testimonial (Row 2, Col 4-6) */}
                <div className="md:col-span-3">
                    <TestimonialCardComponent card={caseStudyCards[2] as TestimonialCard} />
                </div>
            </div>
        </section>
    );
}

