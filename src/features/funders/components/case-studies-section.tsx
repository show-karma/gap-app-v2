import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { CustomerAvatar } from "./customer-avatar";
import { CommunityImage } from "./community-image";

/**
 * Metric card displaying a key statistic with optional community logos.
 */
interface MetricCard {
    readonly type: "metric";
    readonly metric: string;
    readonly description: string;
    readonly communitySlugs: readonly string[];
}

/**
 * Testimonial card featuring a quote from a community leader with optional avatar.
 */
interface TestimonialCard {
    readonly type: "testimonial";
    readonly text: string;
    readonly author: string;
    readonly authorRole: string;
    readonly communitySlug: string;
    readonly link?: string;
    readonly avatar?: string;
}

/**
 * Case study card highlighting a specific customer success story.
 */
interface CaseStudyCard {
    readonly type: "case-study";
    readonly headline: string;
    readonly description: string;
    readonly communitySlug: string;
    readonly link?: string;
    readonly author?: string;
    readonly authorRole?: string;
}

type CaseStudyCardType = MetricCard | TestimonialCard | CaseStudyCard;

const caseStudyCards: CaseStudyCardType[] = [
    {
        type: "testimonial",
        text: "Karma isn't just software, they're a true partner. Their AI-driven evaluations cut review time dramatically. Their platform fits our needs perfectly and their team ships features at lightning speed.",
        author: "Gonna",
        authorRole: "Optimism Grants Council Lead",
        communitySlug: "optimism",
        avatar: "/images/homepage/gonna.png"
    },
    {
        type: "case-study",
        headline: "100+ hours saved on application evaluation",
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
    },
    {
        type: "testimonial",
        text: "Karma has been a valuable partner in helping us grow and support the Celo developer community. Their tools made it easy to recognize contributor impact and run more transparent, data-driven DevRel programs. The team has also been great to work with – responsive, thoughtful, and always looking for ways to improve.",
        author: "Sophia Dew",
        authorRole: "Celo Devrel Lead",
        communitySlug: "celo",
        avatar: "/images/homepage/sophia-dew.png"
    },
];

/**
 * Retrieves the light theme image URL for a community by its slug.
 * @param communitySlug - The unique identifier for the community
 * @returns The light theme image URL if found, null otherwise
 */
function getCommunityImage(communitySlug: string): string | null {
    const communities = chosenCommunities(true);
    const community = communities.find((c) => c.slug === communitySlug);
    if (community) {
        return community.imageURL.light;
    }
    return null;
}

/**
 * Renders a metric card displaying a key statistic with optional community logos.
 * Supports showing multiple communities via the communitySlugs array.
 */
function MetricCardComponent({ card }: { card: MetricCard }) {
    const communities = card.communitySlugs
        .map(slug => {
            const community = chosenCommunities(true).find((c) => c.slug === slug);
            const imageUrl = getCommunityImage(slug);

            if (!community || !imageUrl) {
                return null;
            }

            return { community, imageUrl } as const;
        })
        .filter((item): item is { community: NonNullable<ReturnType<typeof chosenCommunities>[number]>; imageUrl: string } => item !== null);

    return (
        <div className={cn(
            "flex flex-col justify-between",
            "min-h-[317px] h-full w-full",
            "rounded-2xl border border-border bg-background p-5 shadow-sm"
        )}>
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

            {communities.length > 0 && (
                <div className="flex items-center gap-2">
                    {communities.map(({ community, imageUrl }, index) => (
                        <CommunityImage key={index} src={imageUrl} alt={community.name} />
                    ))}
                </div>
            )}
        </div>
    );
}


/**
 * Renders a testimonial card with quote styling and author information.
 * Displays a large quote mark, testimonial text, and optional author avatar.
 */
function TestimonialCardComponent({ card }: { card: TestimonialCard }) {
    return (
        <div className={cn(
            "flex flex-col justify-between",
            "min-h-[317px] h-full w-full",
            "p-5"
        )}>
            <div className="flex flex-col justify-between h-full max-md:gap-2 gap-8">
                <div className="flex flex-col gap-8">
                    <span className={cn(
                        "text-foreground",
                        "font-semibold text-[40px] leading-[44px] tracking-[-0.02em]"
                    )}>
                        {`“`}
                    </span>
                    <p className={cn(
                        "text-foreground font-normal text-sm",
                        "leading-[150%] tracking-[0%]"
                    )}>
                        {card.text}
                    </p>
                </div>
                {(card.author || card.authorRole) && (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            {card.avatar && (
                                <CustomerAvatar src={card.avatar} alt={card.author} />
                            )}
                            {card.author && (
                                <span className={cn(
                                    "text-foreground font-bold text-sm",
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

/**
 * Renders a case study card highlighting a customer success story.
 * Displays headline, description, optional author attribution, community badge, and external link.
 */
function CaseStudyCardComponent({ card }: { card: CaseStudyCard }) {
    const community = chosenCommunities(true).find((c) => c.slug === card.communitySlug);
    const imageUrl = getCommunityImage(card.communitySlug);

    return (
        <div className={cn(
            "flex flex-col justify-between",
            "min-h-[317px] h-full w-full",
            "rounded-2xl border border-border bg-background p-5",
        )}>
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

            <div className="flex items-center justify-between gap-4 flex-wrap">
                {community && imageUrl ? (
                    <div className="flex items-center gap-2">
                        <CommunityImage src={imageUrl} alt={community.name} />
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

/**
 * Main case studies section component displaying customer success stories, metrics, and testimonials.
 * Features a responsive grid layout with varied card types.
 */
export function CaseStudiesSection() {
    return (
        <section className={cn(
            marketingLayoutTheme.padding,
            "flex flex-col items-start w-full gap-16"
        )}
            id="case-studies"
        >
            <div className="flex flex-col items-start gap-4 w-full">
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

            <div className={cn(
                "grid grid-cols-1 md:grid-cols-6 gap-4 w-full",
                "max-w-[1920px]",
                "items-stretch"
            )}>

                <div className="md:col-span-2">
                    <TestimonialCardComponent card={caseStudyCards[0] as TestimonialCard} />
                </div>

                <div className="md:col-span-4">
                    <CaseStudyCardComponent card={caseStudyCards[1] as CaseStudyCard} />
                </div>

                <div className="md:col-span-4">
                    <CaseStudyCardComponent card={caseStudyCards[2] as CaseStudyCard} />
                </div>

                <div className="md:col-span-2">
                    <TestimonialCardComponent card={caseStudyCards[3] as TestimonialCard} />
                </div>
            </div>
        </section>
    );
}

