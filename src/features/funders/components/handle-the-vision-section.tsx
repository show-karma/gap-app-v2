import { cn } from "@/utilities/tailwind";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { Button } from "@/components/UI/button";
import Link from "next/link";
import { SOCIALS } from "@/utilities/socials";

export function HandleTheVisionSection() {
    return (
        <section className={cn(marketingLayoutTheme.padding, "pb-16 md:pb-24")}>
            <div className="flex flex-col items-center gap-6">
                <h2 className="text-3xl md:text-5xl font-semibold text-foreground text-center leading-none tracking-tight">
                    Focus on ecosystem growth and impact.<br /> We handle the infrastructure.
                </h2>
                <p className="text-base md:text-xl font-normal text-muted-foreground text-center leading-[30px] tracking-normal px-4">
                    Ready to grow your community?
                </p>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto px-4 md:px-0">
                    <Button
                        asChild
                    >
                        <Link href={SOCIALS.PARTNER_FORM} target="_blank" rel="noopener noreferrer">Schedule Demo</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}

