import {
  ArrowsRightLeftIcon,
  CheckBadgeIcon,
  CurrencyDollarIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="border bg-card shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex flex-col gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          {icon}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const features: FeatureCardProps[] = [
  {
    icon: <CurrencyDollarIcon className="w-6 h-6" />,
    title: "Fixed $1 Price",
    description:
      "Each Seed is always worth $1. No speculation, no volatility—just straightforward support for projects you believe in.",
  },
  {
    icon: <CheckBadgeIcon className="w-6 h-6" />,
    title: "97% to Projects",
    description:
      "Nearly all funds go directly to the project treasury. Only a 3% platform fee keeps the ecosystem sustainable.",
  },
  {
    icon: <ArrowsRightLeftIcon className="w-6 h-6" />,
    title: "Multiple Payment Options",
    description:
      "Buy Seeds with ETH or stablecoins like USDC. Pay with whatever you have—we convert it automatically.",
  },
  {
    icon: <RocketLaunchIcon className="w-6 h-6" />,
    title: "Instant Launch",
    description:
      "Project owners can launch their Seeds in minutes. No liquidity pools, no complex setup—just deploy and share.",
  },
];

export function WhyKarmaSeeds() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 lg:py-24 w-full bg-secondary/30")}>
      <SectionContainer className="flex flex-col items-center gap-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <h2 className="section-title text-foreground">Why Karma Seeds?</h2>
          <p className="text-muted-foreground text-lg">
            Traditional tokens are volatile and complex. Seeds are simple, stable, and direct.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
