import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, Settings, Share2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <Card className="border-border bg-card h-full">
      <CardContent className="p-6 h-full">
        <div className="flex flex-col gap-4 h-full">
          {/* Step number and icon */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center text-white font-bold">
              {step.number}
            </div>
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Icon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-foreground text-lg">{step.title}</h4>
            <p className="text-muted-foreground">{step.description}</p>
          </div>

          {/* Details */}
          <ul className="space-y-2 mt-auto">
            {step.details.map((detail) => (
              <li key={detail} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export function LaunchHowTo() {
  return (
    <section
      id="get-started"
      className={cn(marketingLayoutTheme.padding, "py-16 w-full scroll-mt-20")}
    >
      <SectionContainer>
        {/* Section Header */}
        <div className="flex flex-col items-center gap-4 mb-12 text-center">
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
          >
            How to Launch
          </Badge>
          <h2 className="section-title text-foreground max-w-3xl">Get started in three steps</h2>
          <p className="text-xl font-normal text-muted-foreground leading-[30px] tracking-normal max-w-2xl">
            Launching Seeds for your project takes just a few minutes. No smart contract deployment
            needed—we handle the infrastructure.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <StepCard step={step} />
              {/* Arrow between steps (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-6 h-6 text-green-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Additional info */}
        <div className="mt-12 text-center max-w-2xl mx-auto">
          <p className="text-muted-foreground">
            Once launched, your supporters can buy Seeds directly through your project page. Funds
            go straight to your treasury address. You can track contributions in your dashboard.
          </p>
        </div>
      </SectionContainer>
    </section>
  );
}
