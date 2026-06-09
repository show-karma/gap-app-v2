import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface Feature {
  label: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    label: "Discovery",
    title: "Search by cause, geography, or approach",
    description:
      "Browse thousands of nonprofits with up-to-date profiles, verified by the organizations themselves.",
  },
  {
    label: "Due diligence",
    title: "See their track record, not just their pitch",
    description:
      "Milestone completions, past grants, funder history, and impact data, all in one place.",
  },
  {
    label: "AI recommendations",
    title: "A giving advisor that learns what you care about",
    description:
      "Tell Karma your priorities and it surfaces the nonprofits best aligned with your goals.",
  },
  {
    label: "Funding gaps",
    title: "Fund what's actually needed right now",
    description:
      "Nonprofits post specific funding requests. You can direct dollars to exactly where they'll go.",
  },
];

export function FeaturesSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-12">
        <div className="flex flex-col items-start gap-4 w-full max-w-[768px]">
          <Badge
            variant="secondary"
            className={cn(
              "text-secondary-foreground font-medium text-xs",
              "leading-[150%] tracking-[0.015em]",
              "rounded-full py-[3px] px-2",
              "bg-secondary border-0 w-fit"
            )}
          >
            How Karma helps you give
          </Badge>

          <h2 className={cn("section-title", "text-left", "w-full")}>
            <span className="text-foreground">From &ldquo;I want to give&rdquo;</span>
            <br />
            <span className="text-muted-foreground">to &ldquo;I found the right one&rdquo;</span>
          </h2>

          <p
            className={cn(
              "text-muted-foreground font-normal text-left",
              "text-[18px] md:text-[20px] leading-[30px]",
              "w-full"
            )}
          >
            Karma replaces the &ldquo;I&apos;ll do my own research&rdquo; nights with a structured
            way to find, vet, and fund the organizations doing real work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {features.map((feature) => (
            <div
              key={feature.label}
              className={cn("flex flex-col gap-3 p-8 md:p-10", "bg-secondary rounded-2xl")}
            >
              <span className="text-muted-foreground font-medium text-xs leading-[150%] tracking-[0.015em] uppercase">
                {feature.label}
              </span>
              <h3 className="text-foreground font-semibold text-[20px] leading-[120%] tracking-[-0.02em]">
                {feature.title}
              </h3>
              <p className="text-muted-foreground font-medium text-sm leading-[20px]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
