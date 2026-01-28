import { CodeBracketIcon, GlobeAltIcon, ServerStackIcon } from "@heroicons/react/24/outline";
import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface UseCaseCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function UseCaseCard({ icon, title, description }: UseCaseCardProps) {
  return (
    <Card className="border bg-card shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex flex-col gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          {icon}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const useCases: UseCaseCardProps[] = [
  {
    icon: <CodeBracketIcon className="w-6 h-6" />,
    title: "Open Source Maintainers",
    description:
      "Give your community a way to support your work directly. No sponsorship tiers to manage, no invoicing—just ongoing funding as supporters buy Seeds.",
  },
  {
    icon: <GlobeAltIcon className="w-6 h-6" />,
    title: "Public Goods Projects",
    description:
      "Build infrastructure the ecosystem needs with sustainable funding. Perfect for tooling, research, and community resources that benefit everyone.",
  },
  {
    icon: <ServerStackIcon className="w-6 h-6" />,
    title: "Protocol Development Teams",
    description:
      "Complement grant funding with community support. Seeds provide steady funding between grant cycles while building community alignment.",
  },
];

export function UseCases() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 lg:py-24 w-full")}>
      <SectionContainer className="flex flex-col items-center gap-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <h2 className="section-title text-foreground">Who Is It For?</h2>
          <p className="text-muted-foreground text-lg">
            Karma Seeds works for any project that creates value for the community and wants
            sustainable, direct funding from supporters.
          </p>
        </div>

        {/* Use Case Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {useCases.map((useCase, index) => (
            <UseCaseCard
              key={index}
              icon={useCase.icon}
              title={useCase.title}
              description={useCase.description}
            />
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
