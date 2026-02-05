import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Settings, Share2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
  details: string[];
}

const steps: Step[] = [
  {
    number: 1,
    icon: Settings,
    title: "Set up your project on Karma",
    description: "Create your project profile, share roadmap and updates",
    details: ["Login to Karma", "Create or navigate to your project", "Update project details"],
  },
  {
    number: 2,
    icon: Wallet,
    title: "Configure your Seeds",
    description: "Set your treasury address where funds will be sent.",
    details: [
      "Go to your project dashboard",
      "Set your treasury wallet address",
      "Choose Seed code and Click 'Launch Seeds'",
      "Review and confirm",
    ],
  },
  {
    number: 3,
    icon: Share2,
    title: "Share with your community",
    description: "Let your supporters know they can now back you with Seeds.",
    details: [
      "Share your project link on social media",
      "Link to your Karma profile on your website",
      "Announce to your community",
    ],
  },
];

function StepCard({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon;
  return (
    <div
      className="group relative p-6 md:p-8 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-white/5 dark:to-white/[0.02] border border-seeds-300/30 dark:border-seeds-300/20 backdrop-blur-sm seeds-card-hover h-full"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex flex-col gap-6 h-full">
        {/* Step number and icon */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-seeds-300 to-seeds-400 flex items-center justify-center text-seeds-600 text-lg font-bold shadow-lg shadow-seeds-300/30">
            {step.number}
          </div>
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-seeds-300/20 to-seeds-300/10 dark:from-seeds-300/30 dark:to-seeds-300/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-6 h-6 text-seeds-400 dark:text-seeds-300" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground text-xl">{step.title}</h4>
          <p className="text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* Details */}
        <ul className="space-y-3 mt-auto pt-4 border-t border-seeds-300/30 dark:border-seeds-300/20">
          {step.details.map((detail) => (
            <li key={detail} className="flex items-start gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-seeds-300 flex-shrink-0 mt-0.5" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function LaunchHowTo() {
  return (
    <section
      id="get-started"
      className={cn(marketingLayoutTheme.padding, "py-16 md:py-24 w-full scroll-mt-20")}
    >
      <SectionContainer>
        {/* Section Header */}
        <div className="flex flex-col items-center gap-5 mb-16 text-center">
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-seeds-300/10 to-seeds-300/5 dark:from-seeds-300/20 dark:to-seeds-300/10 text-seeds-400 dark:text-seeds-300 border border-seeds-300/30 px-4 py-1.5 text-sm font-medium"
          >
            How to Launch
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight max-w-3xl">
            Get started in three steps
          </h2>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-[2px]">
            <div className="w-full h-full bg-gradient-to-r from-seeds-300/30 via-seeds-300/50 to-seeds-300/30 dark:from-seeds-300/20 dark:via-seeds-300/40 dark:to-seeds-300/20 rounded-full" />
          </div>

          {steps.map((step, index) => (
            <StepCard key={step.number} step={step} index={index} />
          ))}
        </div>

        {/* Additional info */}
        <div className="mt-16 text-center max-w-2xl mx-auto">
          <div className="inline-block px-8 py-5 rounded-2xl bg-gradient-to-r from-seeds-300/10 via-seeds-300/5 to-seeds-300/10 border border-seeds-300/30 dark:border-seeds-300/20">
            <p className="text-muted-foreground leading-relaxed">
              Once launched, your supporters can buy Seeds directly through your project page. Funds
              go straight to your treasury address. You can track contributions in your dashboard.
            </p>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
