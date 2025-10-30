import { cn } from "@/utilities/tailwind";
import { homepageTheme } from "@/src/helper/theme";
import { CreateProjectButton } from "./create-project-button";
import { Button } from "@/components/ui/button";

export function WhereBuildersGrow() {
    return (
        <section className={cn(homepageTheme.padding, "py-24")}>
            <div className="flex flex-col items-center gap-6">
                <h2 className="text-5xl font-semibold text-foreground text-center leading-none tracking-[-0.01em]">
                    Where builders grow
                </h2>
                <p className="text-xl font-normal text-muted-foreground text-center leading-[30px] tracking-normal">
                    Join over 4,000+ startups already growing with Karma.
                </p>
                <div className="flex flex-row items-center gap-4">
                    <CreateProjectButton />
                    <Button
                        variant="outline"
                        className="px-6 py-2.5 text-sm font-medium border border-border"
                    >
                        Grow your ecosystem
                    </Button>
                </div>
            </div>
        </section>
    );
}

