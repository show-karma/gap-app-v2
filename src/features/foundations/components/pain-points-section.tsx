import { Eye, FileSpreadsheet, Repeat, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface PainPoint {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const painPoints: PainPoint[] = [
  {
    icon: FileSpreadsheet,
    title: "Fragmented tools",
    description:
      "Google Forms for intake, spreadsheets for tracking, email for updates. Each grant cycle means rebuilding the same workflows from scratch.",
  },
  {
    icon: Eye,
    title: "No portfolio visibility",
    description:
      "No single view of all the projects you have funded, their progress, or their outcomes. Board reporting is a manual scramble every quarter.",
  },
  {
    icon: Repeat,
    title: "Inconsistent evaluation",
    description:
      "Without standardized scoring, every reviewer applies different criteria. Decisions feel subjective and hard to defend.",
  },
  {
    icon: ShieldAlert,
    title: "Accountability gaps",
    description:
      "Once the check is written, tracking whether grantees hit their milestones depends on chasing emails and hope.",
  },
];

export function PainPointsSection() {
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
            Sound Familiar?
          </Badge>

          <h2 className={cn("section-title", "text-left", "w-full")}>
            <span className="text-foreground">Spreadsheets collect applications.</span>
            <br />
            <span className="text-muted-foreground">They don&apos;t run grant programs.</span>
          </h2>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {painPoints.map((point, index) => {
            const IconComponent = point.icon;
            return (
              <div key={index} className="flex flex-col gap-4 bg-secondary rounded-2xl p-8">
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="text-foreground font-semibold text-[20px] leading-[120%] tracking-[-0.02em]">
                  {point.title}
                </h3>
                <p className="text-muted-foreground font-medium text-sm leading-[20px]">
                  {point.description}
                </p>
              </div>
            );
          })}
        </div>
      </SectionContainer>
    </section>
  );
}
