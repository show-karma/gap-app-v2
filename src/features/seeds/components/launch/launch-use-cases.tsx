import type { LucideIcon } from "lucide-react";
import { Blocks, Building2, Gift, Milestone, Rocket, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface UseCase {
  icon: LucideIcon;
  title: string;
  description: string;
  example?: string;
}

const useCases: UseCase[] = [
  {
    icon: Users,
    title: "Build community before launching a token",
    description:
      "Grow a base of aligned supporters while you focus on building. Seeds let you accept money, do good work, and stay focused—without committing to tokenomics.",
    example: "Open-source projects and public goods that may never want a volatile token.",
  },
  {
    icon: Gift,
    title: "Reward early believers later",
    description:
      "Seed holders can receive early access, rev share, or future token allocations. None of this is enforced by the token itself—it's all opt-in and built on top.",
    example: "Private community access, future token allocations, or priority in waitlists.",
  },
  {
    icon: Milestone,
    title: "Milestone-based funding",
    description:
      'Wrap Seeds in escrow contracts. "Fund me $10,000 in Seeds now, I\'ll deliver X by Y date." Seeds enable composable accountability without building custom infrastructure.',
    example: "Escrow contracts, conditional releases, or refund mechanisms.",
  },
  {
    icon: Rocket,
    title: "Bridge to a real token launch",
    description:
      "Raise early support via Seeds. Later launch a real token, use the Seed treasury to bootstrap liquidity, and reward your early supporters with token allocations.",
    example: "Use Seeds as your pre-token fundraise, then convert when you're ready.",
  },
  {
    icon: Blocks,
    title: "Pool Seeds for collective action",
    description:
      "Coordinate funding across a group. Pool contributions, vote on allocations, or create matching pools. Seeds are a building block for more complex funding mechanisms.",
    example: "DAOs, quadratic funding pools, or community treasuries.",
  },
  {
    icon: Building2,
    title: "Foundation for on-chain organizations",
    description:
      "As on-chain incorporation tools mature, Seeds could become the first step in forming real companies—where contributions, ownership, and accountability are cryptographically recorded.",
    example: "This is a long-term idea, not a promise. But the foundation is there.",
  },
];

function UseCaseCard({ useCase }: { useCase: UseCase }) {
  const Icon = useCase.icon;
  return (
    <Card className="border-border bg-card hover:shadow-md transition-shadow h-full">
      <CardContent className="p-6 h-full">
        <div className="flex flex-col gap-4 h-full">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Icon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <h4 className="font-semibold text-foreground text-lg">{useCase.title}</h4>
            <p className="text-muted-foreground leading-relaxed">{useCase.description}</p>
            {useCase.example && (
              <p className="text-sm text-muted-foreground/80 italic mt-auto pt-2">
                {useCase.example}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LaunchUseCases() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 w-full")}>
      <SectionContainer>
        {/* Section Header */}
        <div className="flex flex-col items-center gap-4 mb-6 text-center">
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
          >
            A Composable Primitive
          </Badge>
          <h2 className="section-title text-foreground max-w-3xl">
            One building block, infinite possibilities
          </h2>
          <p className="text-xl font-normal text-muted-foreground leading-[30px] tracking-normal max-w-3xl">
            Complex systems are built by composing simple ones. The internet was built on small,
            dumb protocols. Blockchains work because primitives are minimal and composable. Karma
            Seeds is meant to be one of those Lego blocks.
          </p>
        </div>

        {/* Philosophy note */}
        <div className="max-w-2xl mx-auto mb-12 text-center">
          <p className="text-muted-foreground">
            Instead of designing a full funding system upfront, we're starting with the smallest
            useful unit—and letting real usage shape what comes next. Here's what you can build:
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase) => (
            <UseCaseCard key={useCase.title} useCase={useCase} />
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-12 text-center max-w-2xl mx-auto">
          <p className="text-muted-foreground">
            Seeds don't prescribe behavior—they enable it. What you build on top is up to you.
          </p>
        </div>
      </SectionContainer>
    </section>
  );
}
