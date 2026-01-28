import { CheckIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

const projectsWant = [
  "Raise a bit of money",
  "Build a small but aligned community",
  "Stay focused on building",
];

const projectsDontWant = [
  "Launch a token on day one",
  "Price speculation and volatility",
  "Managing markets before product-market fit",
];

const currentOptions = [
  { option: "Donations", problem: "feel one-way and invisible" },
  { option: "Tokens", problem: "feel premature and risky" },
  { option: "Grants", problem: "are slow and gated" },
];

export function WhyKarmaSeeds() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 lg:py-24 w-full bg-secondary/30")}>
      <SectionContainer className="flex flex-col items-center gap-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <h2 className="section-title text-foreground">The Problem We&apos;re Solving</h2>
          <p className="text-muted-foreground text-lg">
            There are thousands of projects&mdash;especially in open source, crypto, and early-stage
            software&mdash;caught between wanting support and avoiding token chaos.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* What projects want */}
          <Card className="border bg-card shadow-sm">
            <CardContent className="p-6 flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-foreground">What projects want</h3>
              <ul className="flex flex-col gap-3">
                {projectsWant.map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* What projects don't want */}
          <Card className="border bg-card shadow-sm">
            <CardContent className="p-6 flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-foreground">What they don&apos;t want</h3>
              <ul className="flex flex-col gap-3">
                {projectsDontWant.map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <XMarkIcon className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Current options */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <p className="text-muted-foreground">
            Today&apos;s options are awkward:{" "}
            {currentOptions.map((item, index) => (
              <span key={index}>
                <strong className="text-foreground">{item.option}</strong> {item.problem}
                {index < currentOptions.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
          <p className="text-lg font-medium text-foreground">
            We think there&apos;s room for something simpler.
          </p>
        </div>
      </SectionContainer>
    </section>
  );
}
