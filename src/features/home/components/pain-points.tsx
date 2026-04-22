import { BadgeDollarSign, Eye, Puzzle, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface PainPoint {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const painPoints: PainPoint[] = [
  {
    icon: Puzzle,
    title: "Stitched-together tools",
    description:
      "Google Forms for intake, Airtable for tracking, email for updates, Notion for reports. Nothing talks to anything else. Every cycle, you rebuild the same workflow.",
  },
  {
    icon: BadgeDollarSign,
    title: "Expensive and getting worse",
    description:
      "Every tool has its own subscription, its own learning curve, and its own limitations. The cost adds up fast, and you still end up doing manual work to connect them.",
  },
  {
    icon: Wrench,
    title: "Internal tools break",
    description:
      "Building your own system seems like the answer until the person who built it leaves. Internal tools are hard to maintain, hard to scale, and always behind on features.",
  },
  {
    icon: Eye,
    title: "No single source of truth",
    description:
      "Data lives in five places. No one has a complete picture of what's funded, what's on track, and what needs attention. Board reporting becomes a quarterly fire drill.",
  },
];

export function PainPoints() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-12">
        {/* Header */}
        <ScrollReveal variant="fade-up">
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
              Sound Familiar?
            </Badge>

            <h2 className={cn("section-title", "text-left", "w-full")}>
              <span className="text-foreground">Four tools to do one job.</span>
              <br />
              <span className="text-muted-foreground">There&apos;s a better way.</span>
            </h2>
          </div>
        </ScrollReveal>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {painPoints.map((point, index) => {
            const IconComponent = point.icon;
            return (
              <ScrollReveal key={index} variant="fade-up" delay={index * 100}>
                <div className="flex flex-col gap-4 bg-secondary rounded-2xl p-8 h-full">
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-foreground" />
                  </div>
                  <h3 className="text-foreground font-semibold text-xl leading-[120%] tracking-[-0.02em]">
                    {point.title}
                  </h3>
                  <p className="text-muted-foreground font-medium text-sm leading-[22px]">
                    {point.description}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </SectionContainer>
    </section>
  );
}
