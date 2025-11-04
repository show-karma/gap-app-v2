import { Badge } from "@/components/ui/badge";
import { layoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";
import { ThemeImage } from "@/src/components/ui/theme-image";

interface PlatformCard {
    subtitle: string;
    title: string;
    description: string;
    image: string;
}

const platformCards: PlatformCard[] = [
    {
        subtitle: "Application Evaluation",
        title: "Smarter decisions with AI-powered evaluation",
        description: "Leverage AI to evaluate grant applications at scale. Get instant scoring, risk assessments, and funding recommendations based on historical performance, cross-ecosystem reputation, and proposal quality—so you can review and approve funding with confidence.",
        image: "/images/homepage/funder-benefit-01.png"
    },
    {
        subtitle: "Public Registry",
        title: "One place for all projects and their progress",
        description: "A public registry of every project in your ecosystem with complete visibility into funding, milestones, and updates. Track project progress in real-time as grantees submit milestone updates with proof of work.",
        image: "/images/homepage/funder-benefit-02.png"
    },
    {
        subtitle: "Impact",
        title: "Measure what matters with real-time insights",
        description: "Track project metrics automatically through GitHub, Dune, and custom integrations. Apply the industry-leading 'Common Approach' framework to measure impact, evaluate performance in real time, and continuously improve your funding program.",
        image: "/images/homepage/funder-benefit-03.png"
    },
    {
        subtitle: "Distribution",
        title: "Funding methods to meet your needs",
        description: "Support projects smarter: issue direct grants with AI-driven evaluations and milestone-based funding, then scale impact with our retro funding platform.",
        image: "/images/homepage/funder-benefit-04.png"
    }
];

export function PlatformSection() {
    return (
        <section className={cn(
            layoutTheme.padding,
            "flex flex-col items-start w-full gap-16"
        )}>
            <div className="flex flex-col items-start gap-4 w-full max-w-[768px]">
                {/* Our Platform Pill */}
                <Badge
                    variant="secondary"
                    className={cn(
                        "text-secondary-foreground font-medium text-xs",
                        "leading-[150%] tracking-[0.015em]",
                        "rounded-full py-[3px] px-2",
                        "bg-secondary border-0 w-fit"
                    )}
                >
                    Our Platform
                </Badge>

                {/* Main Heading */}
                <h2 className={cn(
                    "text-left font-semibold",
                    "text-[32px] leading-[36px] tracking-[-0.02em]",
                    "md:text-[40px] md:leading-[44px]",
                    "w-full"
                )}>
                    <span className="text-foreground">Modular funding infrastructure</span>
                    <span className="text-muted-foreground"> for growth and impact</span>
                </h2>

                {/* Description */}
                <p className={cn(
                    "text-muted-foreground font-normal text-left",
                    "text-[20px] leading-[30px] tracking-[0%]",
                    "w-full"
                )}>
                    Whether you&apos;re running applications, tracking milestones, or measuring impact, each module works independently and seamlessly together. Launch fast, adapt easily, and scale your ecosystem with confidence.
                </p>
            </div>

            {/* Cards Grid */}
            <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-4 w-full",
                " max-w-[1920px]"
            )}>
                {platformCards.map((card, index) => (
                    <div
                        key={index}
                        className={cn(
                            "flex flex-col justify-between gap-3",
                            "bg-secondary rounded-2xl",
                            "h-[527px]"
                        )}
                    >
                        {/* Text Content */}
                        <div className="flex flex-col gap-2 p-10">
                            {/* Subtitle */}
                            <span className={cn(
                                "text-muted-foreground font-medium text-xs",
                                "leading-[150%] tracking-[0.015em]"
                            )}>
                                {card.subtitle}
                            </span>

                            {/* Title */}
                            <h3 className={cn(
                                "text-foreground font-semibold",
                                "text-[20px] leading-[120%] tracking-[-0.02em]"
                            )}>
                                {card.title}
                            </h3>

                            {/* Description */}
                            <p className={cn(
                                "text-muted-foreground font-medium text-sm",
                                "leading-[20px] tracking-[0%]"
                            )}>
                                {card.description}
                            </p>
                        </div>

                        {/* Image */}
                        <div className="relative w-full h-[294px]">
                            <ThemeImage
                                src={card.image}
                                alt={card.title}
                                fill
                                className="object-contain"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
