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
    description: "Create your project profile with a description, logo, and links.",
    details: [
      "Connect your wallet to Karma",
      "Create or claim your project",
      "Add a description and social links",
    ],
  },
  {
    number: 2,
    icon: Wallet,
    title: "Configure your Seeds",
    description: "Set your treasury address where funds will be sent.",
    details: [
      "Go to your project dashboard",
      "Click 'Launch Seeds'",
      "Set your treasury wallet address",
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
      "Add Seeds to your README or website",
      "Announce to your community",
    ],
  },
];

function StepCard({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon;
  return (
    <div
      className="group relative p-6 md:p-8 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-white/5 dark:to-white/[0.02] border border-emerald-100/50 dark:border-emerald-800/30 backdrop-blur-sm seeds-card-hover h-full"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex flex-col gap-6 h-full">
        {/* Step number and icon */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-emerald-500/30">
            {step.number}
          </div>
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground text-xl">{step.title}</h4>
          <p className="text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* Details */}
        <ul className="space-y-3 mt-auto pt-4 border-t border-emerald-100/50 dark:border-emerald-800/30">
          {step.details.map((detail) => (
            <li key={detail} className="flex items-start gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
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
            className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/50 px-4 py-1.5 text-sm font-medium"
          >
            How to Launch
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight max-w-3xl">
            Get started in three steps
          </h2>
          <p className="text-lg md:text-xl font-normal text-muted-foreground leading-relaxed max-w-2xl">
            Launching Seeds for your project takes just a few minutes. No smart contract deployment
            needed—we handle the infrastructure.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-[2px]">
            <div className="w-full h-full bg-gradient-to-r from-emerald-200 via-green-300 to-emerald-200 dark:from-emerald-800 dark:via-green-700 dark:to-emerald-800 rounded-full" />
          </div>

          {steps.map((step, index) => (
            <StepCard key={step.number} step={step} index={index} />
          ))}
        </div>

        {/* Additional info */}
        <div className="mt-16 text-center max-w-2xl mx-auto">
          <div className="inline-block px-8 py-5 rounded-2xl bg-gradient-to-r from-emerald-50/50 via-green-50/30 to-emerald-50/50 dark:from-emerald-950/30 dark:via-green-950/20 dark:to-emerald-950/30 border border-emerald-100/50 dark:border-emerald-800/30">
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
