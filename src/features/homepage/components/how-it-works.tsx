import { CheckCircle } from "lucide-react";
import { cn } from "@/utilities/tailwind";
import { homepageTheme } from "@/src/helper/theme";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StepCardProps {
    text: string;
    size: 1 | 2 | 3;
    showIcon?: boolean;
}

function StepCard({ text, size, showIcon = true }: StepCardProps) {
    // All cards have equal width (fill), but different heights (only on desktop)
    const heightClasses = {
        1: "", // hug content - natural height
        2: "lg:h-[200px]", // fixed height on desktop only
        3: "lg:h-[256px]", // fixed height on desktop only
    };

    return (
        <Card className={cn(
            "border shadow-sm bg-background relative z-[2] w-full lg:w-[218px]",
            heightClasses[size]
        )}>
            <CardContent className={cn(
                "p-6 flex flex-col justify-between gap-4",
                size === 1 ? "" : "lg:h-full" // Only use h-full for fixed height cards on desktop
            )}>
                {showIcon && (
                    <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-green-100 border-4 border-green-50 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                    </div>
                )}
                <p className="text-xl font-semibold text-foreground leading-[1.2] tracking-[-0.02em]">
                    {text}
                </p>
            </CardContent>
        </Card>
    );
}

interface OutcomeCardProps {
    text: string;
}

function OutcomeCard({ text }: OutcomeCardProps) {
    return (
        <div className="border border-border rounded-lg shadow-sm bg-background p-6 flex flex-col gap-4 w-full">
            <p className="text-xl font-semibold text-foreground leading-[1.2] tracking-[-0.02em]">
                {text}
            </p>
        </div>
    );
}

export function HowItWorks() {
    const steps = [
        { text: "Create project", size: 1 as const },
        { text: "Apply and get funded", size: 2 as const },
        { text: "Add milestones, shared updates and metrics", size: 3 as const },
    ];

    const outcomes = [
        "Build reputation",
        "Get retrofunding",
        "Get donations",
        "Apply for more funding",
    ];

    return (
        <section className={cn(homepageTheme.padding, "py-16 w-full")}>
            {/* Header */}
            <div className="flex flex-col items-start gap-4 mb-12">
                <Badge className="rounded-full bg-secondary px-2 py-1 text-xs font-medium text-accent-foreground">
                    How It Works
                </Badge>
                <div className="flex flex-col gap-1">
                    <h2 className="text-4xl font-semibold text-foreground leading-tight">
                        One profile.
                    </h2>
                    <h2 className="text-4xl font-semibold text-muted-foreground leading-tight">
                        Unlimited possibilities.
                    </h2>
                </div>
            </div>

            {/* Flow Diagram */}
            <div className="flex flex-col lg:flex-row lg:justify-between items-center gap-6 lg:gap-4 w-full relative">
                {/* Connector line - vertical on mobile, horizontal on desktop */}
                <div className="absolute left-1/2 lg:left-0 top-0 lg:top-1/2 -translate-x-1/2 lg:translate-x-0 lg:-translate-y-1/2 w-px lg:w-[calc(100%-2rem)] h-full lg:h-px bg-border z-0" />

                {/* Step Cards */}
                <div className="flex flex-col lg:flex-row lg:justify-between items-center gap-4 lg:gap-4 flex-1 w-full lg:w-auto relative z-10">
                    {steps.map((step, index) => (
                        <StepCard key={index} text={step.text} size={step.size} />
                    ))}
                    <Card className="border shadow-sm bg-background p-6 w-full lg:w-[218px]">
                        <div className="flex items-start mb-4">
                            <div className="w-8 h-8 rounded-full bg-green-100 border-4 border-green-50 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            {outcomes.map((outcome, index) => (
                                <OutcomeCard key={index} text={outcome} />
                            ))}
                        </div>
                    </Card>
                </div>

            </div>
        </section>
    );
}

