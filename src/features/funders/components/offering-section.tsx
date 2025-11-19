"use client";

import { SquareCheckBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utilities/tailwind";
import { marketingLayoutTheme } from "@/src/helper/theme";
import Link from "next/link";
import { SOCIALS } from "@/utilities/socials";

export interface PricingTier {
    name: string;
    description: string;
    features: string[];
    mostPopular: boolean;
}

const pricingTiers: PricingTier[] = [
    {
        name: "Starter",
        description: "Start your accountability journey with limited distribution capabilities",
        features: [
            "Track up to 100 projects & 25 grants",
            "Milestone tracking with onchain attestations",
            "Full API access + 3 integrations (GitHub, Dune, CSV)",
            "Email support (48hr response)",
        ],
        mostPopular: false,
    },
    {
        name: "Pro",
        description: "Scale to unlimited funding rounds with full platform capabilities",
        features: [
            "Track up to 500 projects with unlimited grants",
            "AI application review & impact assessment",
            "8 integrations + Web3 bundle (Discord, Telegram)",
            "Dedicated Telegram support (24hr) + monthly check-ins",
        ],
        mostPopular: true,
    },
    {
        name: "Enterprise",
        description: "Continuous grant operations with custom deployment options",
        features: [
            "Track 2,000+ projects with unlimited grants & API usage",
            "All AI automation + full ecosystem intelligence",
            "Multi-chain deployments with white-label branding",
            "Dedicated success manager + 4-hour critical SLA",
            "Custom agentic grants council",
        ],
        mostPopular: false,
    },
];

export function OfferingSection() {
    return (
        <section
            className={cn(
                marketingLayoutTheme.padding,
                "flex flex-col items-start w-full gap-16"
            )}
        >
            {/* Header Content */}
            <div className="flex flex-col items-start gap-4 w-full max-w-xl">
                {/* Our Offering Pill */}
                <div className="w-full flex justify-start">
                    <span className="bg-secondary text-secondary-foreground font-medium text-xs leading-[150%] tracking-[0.015em] text-center rounded-full py-[3px] px-2">
                        Our Offering
                    </span>
                </div>

                {/* Main Heading */}
                <h2
                    className={cn(
                        "section-title text-left max-w-[768px] w-full"
                    )}
                >
                    <span className="text-muted-foreground">Start where you are,</span><br /> <span className="text-foreground">scale when you&apos;re ready</span>
                </h2>

                {/* Subtitle */}
                <p className="text-muted-foreground font-normal text-xl leading-[30px] tracking-[0%] text-left w-full">
                    Choose your growth path.
                </p>
            </div>

            {/* Pricing Cards */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
                {pricingTiers.map((tier) =>
                    tier.mostPopular ? (
                        // Most Popular Card with special styling
                        <div
                            key={tier.name}
                            className="bg-primary rounded-2xl p-0.5 flex flex-col"
                        >
                            {/* Most Popular Badge */}
                            <div className="text-left bg-primary text-primary-foreground font-medium text-sm leading-5 tracking-[0%] py-2 px-8 rounded-t-2xl">
                                Most popular
                            </div>

                            {/* Inner Card */}
                            <div className="bg-background rounded-2xl p-8 flex flex-col justify-between flex-1 h-full gap-10 xl:max-h-[500px] min-h-max lg:min-h-[500px]">
                                {/* Title and Subtitle */}
                                <div className="flex flex-col gap-2">
                                    <h3 className="text-foreground font-semibold text-2xl leading-[120%] tracking-[-0.02em]">
                                        {tier.name}
                                    </h3>
                                    <p className="text-muted-foreground font-medium text-base leading-[150%] tracking-[0%]">
                                        {tier.description}
                                    </p>
                                </div>

                                {/* Features List */}
                                <ul className="flex flex-col gap-2 mt-4 lg:mt-16">
                                    {tier.features.map((feature, index) => (
                                        <li key={index} className="flex gap-2 items-start">
                                            <SquareCheckBig className="w-3 h-3 text-foreground flex-shrink-0 mt-[3px]" />
                                            <span className="text-foreground font-normal text-sm leading-[150%] tracking-[0.005em]">
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        // Standard Cards
                        <div
                            key={tier.name}
                            className="rounded-2xl border border-border p-8 flex flex-col h-full xl:max-h-[480px] justify-between gap-16"
                        >
                            {/* Title and Subtitle */}
                            <div className="flex flex-col gap-2">
                                <h3 className="text-foreground font-semibold text-2xl leading-[120%] tracking-[-0.02em]">
                                    {tier.name}
                                </h3>
                                <p className="text-muted-foreground font-medium text-base leading-[150%] tracking-[0%]">
                                    {tier.description}
                                </p>
                            </div>

                            {/* Features List */}
                            <ul className="flex flex-col gap-2">
                                {tier.features.map((feature, index) => (
                                    <li key={index} className="flex gap-2 items-start">
                                        <SquareCheckBig className="w-3 h-3 text-foreground flex-shrink-0 mt-[3px]" />
                                        <span className="text-foreground font-normal text-sm leading-[150%] tracking-[0.005em]">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                )}
            </div>

            {/* CTA Section */}
            <div className="w-full flex flex-col items-center gap-6 mt-6">
                <p className="text-muted-foreground font-normal text-xl leading-[30px] tracking-[0%] text-center">
                    Ready to Scale Your Ecosystem?
                </p>
                <Button
                    asChild
                    className="bg-foreground text-background hover:bg-foreground/90 rounded-lg font-medium px-6 py-2.5"
                >
                    <Link href={SOCIALS.PARTNER_FORM} target="_blank" rel="noopener noreferrer">
                        Schedule Demo
                    </Link>
                </Button>
            </div>
        </section>
    );
}

