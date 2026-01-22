import { ArrowRightIcon, CheckCircleIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

const benefits = ["No setup fee", "Deploy in minutes", "Testnet ready"];

export function CtaSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 lg:py-24 w-full")}>
      <SectionContainer className="flex flex-col items-center gap-8 text-center">
        {/* Heading */}
        <div className="flex flex-col items-center gap-4 max-w-2xl">
          <h2 className="section-title text-foreground">Ready to Launch Your Seeds?</h2>
          <p className="text-muted-foreground text-lg">
            If you&apos;re a project owner, you can launch Seeds directly from your project page.
            Look for the &quot;Launch Seeds&quot; option in the admin menu.
          </p>
        </div>

        {/* CTA Button */}
        <Button
          asChild
          className="h-12 px-6 text-base font-medium bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl"
        >
          <Link href={PAGES.MY_PROJECTS}>
            Go to My Projects
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </Link>
        </Button>

        {/* Benefits */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-4">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-muted-foreground">
              <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium">{benefit}</span>
            </div>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
