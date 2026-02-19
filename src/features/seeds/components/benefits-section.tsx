import type { LucideIcon } from "lucide-react";
import { ArrowRight, BadgeCheck, Gift, Receipt, Wallet } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface Reason {
  icon: LucideIcon;
  title: string;
  description: string;
}

const reasons: Reason[] = [
  {
    icon: Receipt,
    title: "More than a donation",
    description:
      "Donations feel one-way and invisible. With Seeds, you get a token in your wallet—visible proof that you supported a project early. It's yours to keep.",
  },
  {
    icon: Gift,
    title: "Projects can reward you",
    description:
      "Seed holders may receive early access, rev share, or future token allocations when a project grows. None of this is guaranteed—but the door is open.",
  },
  {
    icon: Wallet,
    title: "Portable and transferable",
    description:
      "Seeds are standard ERC-20 tokens. Unlike donation receipts, they live in your wallet, can be transferred, and can be used in whatever ways the ecosystem builds.",
  },
  {
    icon: BadgeCheck,
    title: "Mark yourself as an early believer",
    description:
      "Your Seeds are on-chain proof of early support. When a project grows, your Seeds show you were there from the beginning—before the hype, before the token launch.",
  },
];

function ReasonCard({ reason, index }: { reason: Reason; index: number }) {
  const Icon = reason.icon;
  return (
    <div
      className="group relative p-6 md:p-8 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-white/5 dark:to-white/[0.02] border border-seeds-300/30 dark:border-seeds-300/20 backdrop-blur-sm seeds-card-hover"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-seeds-300/20 to-transparent dark:from-seeds-300/10 rounded-tr-2xl rounded-bl-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="flex flex-col gap-5 relative">
        {/* Icon */}
        <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-seeds-300/20 to-seeds-300/10 dark:from-seeds-300/30 dark:to-seeds-300/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-7 h-7 text-seeds-400 dark:text-seeds-300" />
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground text-xl">{reason.title}</h4>
          <p className="text-muted-foreground leading-relaxed">{reason.description}</p>
        </div>
      </div>
    </div>
  );
}

export function SeedsBenefits() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 md:py-24 w-full")}>
      <SectionContainer>
        {/* Section Header */}
        <div className="flex flex-col items-center gap-5 mb-16 text-center">
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-seeds-300/10 to-seeds-300/5 dark:from-seeds-300/20 dark:to-seeds-300/10 text-seeds-400 dark:text-seeds-300 border border-seeds-300/30 px-4 py-1.5 text-sm font-medium"
          >
            Why Seeds?
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight max-w-3xl">
            Support that gives you something back
          </h2>
          <p className="text-lg md:text-xl font-normal text-muted-foreground leading-relaxed max-w-2xl">
            Today, your options for supporting projects are limited. Donations feel invisible.
            Buying tokens feels risky. Seeds give you a middle ground—proof of support that could
            become more.
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {reasons.map((reason, index) => (
            <ReasonCard key={reason.title} reason={reason} index={index} />
          ))}
        </div>

        {/* Link to Projects page for those who want more depth */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-r from-seeds-300/10 via-seeds-300/5 to-seeds-300/10 border border-seeds-300/30 dark:border-seeds-300/20">
            <p className="text-muted-foreground">
              Building a project and curious what you can do with Seeds?
            </p>
            <Button
              asChild
              variant="outline"
              className="border-seeds-300 text-seeds-400 hover:bg-seeds-300/10 dark:border-seeds-300/50 dark:text-seeds-300 dark:hover:bg-seeds-300/10 rounded-xl font-medium px-6 group"
            >
              <Link href="/seeds">
                Learn about launching Seeds
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
