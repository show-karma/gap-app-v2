import { CubeIcon } from "@heroicons/react/24/outline";
import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

const analogies = [
  { example: "The internet", description: "built on small, dumb protocols" },
  { example: "Blockchains", description: "work because primitives are minimal and composable" },
  { example: "Lego", description: "works because each block is self-contained" },
];

export function WhySimple() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 lg:py-24 w-full")}>
      <SectionContainer className="flex flex-col items-center gap-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <CubeIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="section-title text-foreground">Why Keep It Simple?</h2>
          <p className="text-xl font-medium text-foreground">
            Complex systems are built by composing simple ones.
          </p>
        </div>

        {/* Analogies */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
          {analogies.map((item, index) => (
            <Card key={index} className="border bg-card shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="font-semibold text-foreground">{item.example}</p>
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Philosophy */}
        <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10 w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <p className="text-lg text-foreground">
              Karma Seeds is meant to be one of those Lego blocks.
            </p>
            <p className="text-muted-foreground mt-4">
              Instead of designing a full funding system upfront, we&apos;re starting with the
              smallest useful unit&mdash;and letting real usage shape what comes next.
            </p>
          </CardContent>
        </Card>
      </SectionContainer>
    </section>
  );
}
