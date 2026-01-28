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
    title: "Fixed $1 Price Per Seed",
    description:
      "No complex tokenomics. No price speculation. Each Karma Seed equals exactly $1 USD, making funding predictable for both supporters and projects.",
  },
  {
    icon: <CheckBadgeIcon className="w-6 h-6" />,
    title: "97% Direct to Projects",
    description:
      "Nearly all funds go directly to the project treasury instantly. Only a 3% platform fee keeps the ecosystem sustainable. No middlemen, no delays.",
  },
  {
    icon: <ArrowsRightLeftIcon className="w-6 h-6" />,
    title: "Pay With What You Have",
    description:
      "Support projects using ETH, USDC, USDT, or any token with a Uniswap pool on Base. The smart contract handles conversions automatically.",
  },
  {
    icon: <RocketLaunchIcon className="w-6 h-6" />,
    title: "5-Minute Setup",
    description:
      "Project owners deploy their custom Seed token in a single transaction. No liquidity provision, no complex DeFi knowledge required.",
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
            Traditional funding is complex. Grant cycles are slow. Token launches require DeFi
            expertise. Karma Seeds makes project funding simple, stable, and instant.
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
