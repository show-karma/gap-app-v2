import type { LucideIcon } from "lucide-react";
import { Blocks, Building2, Gift, Milestone, Rocket, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
      '"Fund me $10,000 in Seeds now, I\'ll deliver X by Y date." Seeds enable composable accountability without building custom infrastructure.',
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

function UseCaseCard({ useCase, index }: { useCase: UseCase; index: number }) {
  const Icon = useCase.icon;
  return (
    <div
      className="group relative p-6 md:p-8 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-white/5 dark:to-white/[0.02] border border-emerald-100/50 dark:border-emerald-800/30 backdrop-blur-sm seeds-card-hover h-full"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-100/50 to-transparent dark:from-emerald-900/30 rounded-tr-2xl rounded-bl-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="flex flex-col gap-5 relative h-full">
        {/* Icon */}
        <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        </div>

        {/* Content */}
        <div className="space-y-3 flex-1">
          <h4 className="font-semibold text-foreground text-xl">{useCase.title}</h4>
          <p className="text-muted-foreground leading-relaxed">{useCase.description}</p>
          {useCase.example && (
            <p className="text-sm text-muted-foreground/70 italic pt-2 border-t border-emerald-100/50 dark:border-emerald-800/30">
              {useCase.example}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function LaunchUseCases() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 md:py-24 w-full")}>
      <SectionContainer>
        {/* Section Header */}
        <div className="flex flex-col items-center gap-5 mb-8 text-center">
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/50 px-4 py-1.5 text-sm font-medium"
          >
            A Composable Primitive
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight max-w-3xl">
            One building block, infinite possibilities
          </h2>
          <p className="text-lg md:text-xl font-normal text-muted-foreground leading-relaxed max-w-3xl">
            Complex systems are built by composing simple ones. The internet was built on small,
            dumb protocols. Blockchains work because primitives are minimal and composable. Karma
            Seeds is meant to be one of those Lego blocks.
          </p>
        </div>

        {/* Philosophy note */}
        <div className="max-w-2xl mx-auto mb-16 text-center">
          <div className="inline-block px-6 py-4 rounded-xl bg-gradient-to-r from-white/60 to-white/30 dark:from-white/5 dark:to-white/[0.02] border border-emerald-100/30 dark:border-emerald-800/20 backdrop-blur-sm">
            <p className="text-muted-foreground leading-relaxed">
              Instead of designing a full funding system upfront, we're starting with the smallest
              useful unit—and letting real usage shape what comes next. Here's what you can build:
            </p>
          </div>
        </div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {useCases.map((useCase, index) => (
            <UseCaseCard key={useCase.title} useCase={useCase} index={index} />
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-16 text-center max-w-2xl mx-auto">
          <div className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-50/50 via-green-50/30 to-emerald-50/50 dark:from-emerald-950/30 dark:via-green-950/20 dark:to-emerald-950/30 border border-emerald-100/50 dark:border-emerald-800/30">
            <p className="text-muted-foreground font-medium">
              Seeds don't prescribe behavior—they enable it. What you build on top is up to you.
            </p>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
