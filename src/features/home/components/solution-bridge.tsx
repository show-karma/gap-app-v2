import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface Replacement {
  before: string;
  after: string;
}

const replacements: Replacement[] = [
  {
    before: "Stitched-together tools",
    after: "One platform from intake to impact",
  },
  {
    before: "Manual review of every application",
    after: "AI agents handle the first pass, filtering unqualified applications",
  },
  {
    before: "Quarterly reporting scramble",
    after: "Board-ready impact, always current",
  },
  {
    before: "Internal tools you maintain",
    after: "Software we run, you direct",
  },
];

export function SolutionBridge() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-10">
        <ScrollReveal variant="fade-up">
          <div className="flex flex-col items-start gap-4 w-full max-w-2xl">
            <Badge
              variant="secondary"
              className={cn(
                "text-secondary-foreground font-medium text-xs",
                "leading-[150%] tracking-[0.015em]",
                "rounded-full py-[3px] px-2",
                "bg-secondary border-0 w-fit inline-flex items-center gap-1.5"
              )}
            >
              <Sparkles className="w-3 h-3" />
              How Karma works instead
            </Badge>

            <h2 className={cn("section-title", "text-left", "w-full")}>
              <span className="text-foreground">One platform.</span>
              <br />
              <span className="text-muted-foreground">AI agents that do the work for you.</span>
            </h2>
            <p className="text-muted-foreground font-medium text-base md:text-lg leading-[28px] mt-2">
              Karma collapses the four-tool patchwork into a single platform. Agents handle the
              operational layer continuously. Your team makes the funding decisions.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={120}>
          <div
            className={cn(
              "w-full rounded-2xl border border-border bg-secondary",
              "overflow-hidden"
            )}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="flex flex-col gap-4 p-6 md:p-8">
                <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground">
                  The status quo
                </span>
                <ul className="flex flex-col gap-3">
                  {replacements.map((row) => (
                    <li
                      key={row.before}
                      className="flex items-start gap-3 text-foreground/80 line-through decoration-foreground/30 font-medium text-[15px] leading-[150%]"
                    >
                      <span aria-hidden className="text-muted-foreground select-none">
                        ✕
                      </span>
                      {row.before}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-4 p-6 md:p-8 bg-background/40">
                <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground">
                  With Karma
                </span>
                <ul className="flex flex-col gap-3">
                  {replacements.map((row) => (
                    <li
                      key={row.after}
                      className="flex items-start gap-3 text-foreground font-semibold text-[15px] leading-[150%]"
                    >
                      <span aria-hidden className="text-foreground select-none">
                        →
                      </span>
                      {row.after}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
