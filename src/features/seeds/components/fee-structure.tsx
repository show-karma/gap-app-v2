import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

export function FeeStructure() {
  return (
    <section
      className={cn(
        marketingLayoutTheme.padding,
        "py-16 lg:py-24 w-full",
        "bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-950/20 dark:to-transparent"
      )}
    >
      <SectionContainer className="flex flex-col items-center gap-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <h2 className="section-title text-foreground">Transparent Fee Structure</h2>
          <p className="text-muted-foreground text-lg">
            When someone buys Seeds, here&apos;s exactly where the funds go.
          </p>
        </div>

        {/* Fee Breakdown Card */}
        <Card className="w-full max-w-2xl border bg-card shadow-md">
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
              {/* Project Treasury */}
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-5xl md:text-6xl font-bold text-emerald-600 dark:text-emerald-400">
                  97%
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold text-foreground">Project Treasury</span>
                  <span className="text-sm text-muted-foreground">
                    Direct to your wallet, instantly
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-24 bg-border" />
              <div className="sm:hidden w-24 h-px bg-border" />

              {/* Platform Fee */}
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-5xl md:text-6xl font-bold text-muted-foreground/60">3%</span>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-semibold text-foreground">Platform Fee</span>
                  <span className="text-sm text-muted-foreground">Keeps the ecosystem running</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </SectionContainer>
    </section>
  );
}
