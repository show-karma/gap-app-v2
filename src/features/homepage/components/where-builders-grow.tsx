import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { CreateProjectButton } from "./create-project-button";

export function WhereBuildersGrow() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-24")}>
      <SectionContainer>
        <div className="flex flex-col items-center gap-6">
          <h2 className="section-title text-foreground text-center">Where builders grow</h2>
          <p className="text-xl font-normal text-muted-foreground text-center leading-[30px] tracking-normal">
            Join over 4,000+ startups already growing with Karma.
          </p>
          <div className="relative flex flex-col md:flex-row gap-3 md:gap-3">
            {/* Blurred gradient background */}
            <div className="absolute -left-2 -right-1 -bottom-1 h-[60%] bg-gradient-to-r from-purple-300 to-emerald-300 opacity-80 blur-md" />
            <div className="relative z-0">
              <CreateProjectButton styleClass="h-auto px-5 py-3 text-sm font-medium w-max bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow" />
            </div>
            <Button
              variant="outline"
              className="h-auto px-5 py-3 text-sm font-medium border border-black/15 bg-white/10 hover:bg-white/20 relative z-0 backdrop-blur-sm"
              asChild
            >
              <Link href={PAGES.FUNDERS}>Grow your ecosystem</Link>
            </Button>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
