import { CheckIcon } from "@heroicons/react/20/solid";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

const technicalFeatures = [
  "Chainlink price feeds for accurate ETH pricing",
  "Uniswap V3 TWAP for supported token conversions",
  "Non-transferable tokens (no secondary market speculation)",
  "Factory pattern for consistent, auditable deployments",
  "Optional supply caps for controlled fundraising",
];

const baseNetworkBenefits = [
  "Sub-cent transaction fees",
  "Fast block confirmations",
  "Strong ecosystem liquidity",
  "Ethereum security guarantees",
];

export function TechnicalOverview() {
  return (
    <section
      className={cn(
        marketingLayoutTheme.padding,
        "py-16 lg:py-24 w-full",
        "bg-gradient-to-b from-slate-50/80 to-transparent dark:from-slate-900/40 dark:to-transparent"
      )}
    >
      <SectionContainer className="flex flex-col items-center gap-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <h2 className="section-title text-foreground">Built on Solid Foundations</h2>
          <p className="text-muted-foreground text-lg">
            Karma Seeds leverages proven DeFi infrastructure for reliable, trustworthy funding.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Smart Contract Features */}
          <div className="flex flex-col gap-4 p-6 rounded-2xl bg-card border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Smart Contract Architecture</h3>
            <ul className="flex flex-col gap-3">
              {technicalFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Base Network Benefits */}
          <div className="flex flex-col gap-4 p-6 rounded-2xl bg-card border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Why Base Network?</h3>
            <ul className="flex flex-col gap-3">
              {baseNetworkBenefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Karma Seeds is deployed on Base (Chain ID: 8453) for optimal cost and user experience.
            </p>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
