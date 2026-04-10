import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

export interface Objection {
  question: string;
  answer: string;
}

export const objections: Objection[] = [
  {
    question: '"We\'re too small for this."',
    answer:
      "That's exactly who we built this for. Karma replaces the patchwork of tools small teams cobble together. No large team or IT department required.",
  },
  {
    question: '"We already use spreadsheets and they work fine."',
    answer:
      "Spreadsheets work until they don't — fragmented review, no audit trail, manual board reporting. Karma gives you governance-grade structure with the same simplicity.",
  },
  {
    question: '"We don\'t need AI."',
    answer:
      "The AI runs in the background. You don't configure it, train it, or think about it. You just get pre-scored applications and save hours of review time per cycle.",
  },
  {
    question: '"Switching tools sounds painful."',
    answer:
      "Implementation is done for you. We configure your intake, evaluation, and dashboards. Most foundations are live within a week with zero disruption to current cycles.",
  },
];

export function ObjectionsSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-16">
        {/* Header */}
        <div className="flex flex-col items-start gap-4 w-full max-w-xl">
          <Badge
            variant="secondary"
            className={cn(
              "text-secondary-foreground font-medium text-xs",
              "leading-[150%] tracking-[0.015em]",
              "rounded-full py-[3px] px-2",
              "bg-secondary border-0 w-fit"
            )}
          >
            Common Questions
          </Badge>

          <h2 className={cn("section-title", "text-left", "w-full")}>
            <span className="text-foreground">We get it.</span>
            <br />
            <span className="text-muted-foreground">Here&apos;s the honest answer.</span>
          </h2>
        </div>

        {/* Objections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {objections.map((objection, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-2xl border border-border p-8">
              <h3 className="text-foreground font-semibold text-lg leading-[120%] tracking-[-0.02em]">
                {objection.question}
              </h3>
              <p className="text-muted-foreground font-medium text-sm leading-[20px]">
                {objection.answer}
              </p>
            </div>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
