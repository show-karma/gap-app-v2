import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

const tokenAssumptions = [
  "Price speculation",
  "Charts and trading",
  "Expected upside",
  '"When token?" energy',
];

const seedImplies = [
  { word: "Support", contrast: "not speculation" },
  { word: "Early belief", contrast: "not guaranteed returns" },
  { word: "Something planted", contrast: "not something traded" },
  { word: "Long-term growth", contrast: "not short-term price action" },
];

export function WhySeedsNaming() {
  return (
    <section
      className={cn(
        marketingLayoutTheme.padding,
        "py-16 lg:py-24 w-full",
        "bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-950/20 dark:to-transparent"
      )}
    >
      <SectionContainer className="flex flex-col items-center gap-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <h2 className="section-title text-foreground">Why &ldquo;Seeds&rdquo;?</h2>
          <p className="text-muted-foreground text-lg">
            Even though Karma Seeds is technically an ERC-20 token, we were very intentional about
            not calling it a &ldquo;token&rdquo; in the usual sense.
          </p>
        </div>

        {/* Two Column Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* Token assumptions */}
          <Card className="border bg-card shadow-sm">
            <CardContent className="p-6 flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-foreground">
                When something looks like a token, people assume:
              </h3>
              <ul className="flex flex-col gap-2">
                {tokenAssumptions.map((item, index) => (
                  <li
                    key={index}
                    className="text-muted-foreground py-2 border-b border-border last:border-0"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground italic">
                That mental model is exactly what we&apos;re trying to avoid.
              </p>
            </CardContent>
          </Card>

          {/* Seed implies */}
          <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm">
            <CardContent className="p-6 flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-foreground">A Seed implies:</h3>
              <ul className="flex flex-col gap-2">
                {seedImplies.map((item, index) => (
                  <li
                    key={index}
                    className="py-2 border-b border-emerald-200 dark:border-emerald-800 last:border-0"
                  >
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      {item.word}
                    </span>
                    <span className="text-muted-foreground">, {item.contrast}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Bottom quote */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <p className="text-muted-foreground">
            By using a different convention, we&apos;re trying to reset expectations from day one.
          </p>
          <p className="text-lg text-foreground">
            This is not:{" "}
            <span className="italic">&ldquo;Here&apos;s a token, good luck.&rdquo;</span>
          </p>
          <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400">
            It&apos;s: &ldquo;Here&apos;s a seed. What grows from it depends on the project, the
            community, and time.&rdquo;
          </p>
        </div>
      </SectionContainer>
    </section>
  );
}
