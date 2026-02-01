import { ArrowRightIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

const audiences = [
  "Building something and don't want to launch a token yet",
  "Supporting projects and want a transparent on-chain receipt",
  "Experimenting with new funding models",
  "Or just curious",
];

export function CtaSection() {
  return (
    <section
      className={cn(
        marketingLayoutTheme.padding,
        "py-16 lg:py-24 w-full",
        "bg-gradient-to-b from-emerald-50/60 to-transparent dark:from-emerald-950/20 dark:to-transparent"
      )}
    >
      <SectionContainer className="flex flex-col items-center gap-8 text-center">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 max-w-2xl">
          <h2 className="section-title text-foreground">An Invitation</h2>
          <p className="text-muted-foreground text-lg">If you&apos;re:</p>
        </div>

        {/* Audiences */}
        <Card className="border bg-card shadow-sm w-full max-w-md">
          <CardContent className="p-6">
            <ul className="flex flex-col gap-2 text-left">
              {audiences.map((audience, index) => (
                <li
                  key={index}
                  className="text-muted-foreground py-2 border-b border-border last:border-0"
                >
                  {audience}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Call to action */}
        <div className="flex flex-col items-center gap-4 max-w-2xl">
          <p className="text-lg text-foreground">
            We&apos;d love for you to try Karma Seeds, break it, critique it, and help shape what
            comes next.
          </p>
          <p className="text-xl font-medium text-emerald-600 dark:text-emerald-400">
            Simple blocks. Honest experimentation. Let&apos;s see what grows.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button
            asChild
            className="h-12 px-6 text-base font-medium bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl"
          >
            <Link href={PAGES.MY_PROJECTS}>
              Launch Seeds for Your Project
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 px-6 text-base font-medium rounded-xl border-2"
          >
            <Link href={PAGES.PROJECTS_EXPLORER}>Explore Projects to Support</Link>
          </Button>
        </div>
      </SectionContainer>
    </section>
  );
}
