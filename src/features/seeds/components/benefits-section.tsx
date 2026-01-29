import type { LucideIcon } from "lucide-react";
import { ArrowRight, BadgeCheck, Gift, Receipt, Wallet } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function ReasonCard({ reason }: { reason: Reason }) {
  const Icon = reason.icon;
  return (
    <Card className="border-border bg-card hover:shadow-md transition-shadow h-full">
      <CardContent className="p-6 h-full">
        <div className="flex flex-col gap-4 h-full">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Icon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-foreground text-lg">{reason.title}</h4>
            <p className="text-muted-foreground leading-relaxed">{reason.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SeedsBenefits() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 w-full")}>
      <SectionContainer>
        {/* Section Header */}
        <div className="flex flex-col items-center gap-4 mb-12 text-center">
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
          >
            Why Seeds?
          </Badge>
          <h2 className="section-title text-foreground max-w-3xl">
            Support that gives you something back
          </h2>
          <p className="text-xl font-normal text-muted-foreground leading-[30px] tracking-normal max-w-2xl">
            Today, your options for supporting projects are limited. Donations feel invisible.
            Buying tokens feels risky. Seeds give you a middle ground—proof of support that could
            become more.
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reasons.map((reason) => (
            <ReasonCard key={reason.title} reason={reason} />
          ))}
        </div>

        {/* Link to Projects page for those who want more depth */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Building a project and curious what you can do with Seeds?
          </p>
          <Button
            asChild
            variant="outline"
            className="border-green-600 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-950/50"
          >
            <Link href="/seeds/launch">
              Learn about launching Seeds
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </SectionContainer>
    </section>
  );
}
