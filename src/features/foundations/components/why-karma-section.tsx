import { LayoutDashboard, MousePointerClick, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface Advantage {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tagline: string;
  description: string;
}

const advantages: Advantage[] = [
  {
    icon: MousePointerClick,
    title: "No training required",
    tagline: "Intuitive by design",
    description:
      "Most grant software is built for large institutions with IT teams. Karma is built for lean teams. If you can use a spreadsheet, you can run Karma. Zero onboarding burden, no 3-week implementations.",
  },
  {
    icon: Sparkles,
    title: "AI that saves hours, not adds complexity",
    tagline: "Time compression engine",
    description:
      "AI reviews, summarizes, and scores applications in the background. You don't need to learn prompt engineering or configure models. You just save time — typically 70% less on application review.",
  },
  {
    icon: LayoutDashboard,
    title: "Full visibility for your board",
    tagline: "Live portfolio dashboard",
    description:
      "See every project you've funded, their milestones, and their outcomes in one place. Generate board-ready reports instantly instead of spending days compiling spreadsheets every quarter.",
  },
];

export function WhyKarmaSection() {
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
            Why Karma
          </Badge>

          <h2 className={cn("section-title", "text-left", "w-full")}>
            <span className="text-foreground">Built for foundations</span>
            <br />
            <span className="text-muted-foreground">that run lean and move fast</span>
          </h2>
        </div>

        {/* Advantages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full items-stretch">
          {advantages.map((advantage, index) => {
            const IconComponent = advantage.icon;
            return (
              <div key={index} className="flex flex-col items-center gap-4 h-full">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-foreground" />
                </div>

                <div className="flex flex-col w-full h-full rounded-2xl bg-secondary p-8">
                  <div className="flex flex-col items-start gap-3">
                    <span className="text-muted-foreground font-medium text-xs leading-[150%] tracking-[0.015em]">
                      {advantage.tagline}
                    </span>
                    <h3 className="text-foreground font-semibold text-[20px] leading-[120%] tracking-[-0.02em]">
                      {advantage.title}
                    </h3>
                    <p className="text-muted-foreground font-medium text-sm leading-[20px]">
                      {advantage.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionContainer>
    </section>
  );
}
