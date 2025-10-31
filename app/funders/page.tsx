import { Hero } from "@/src/features/funders/components/hero";
import { NumbersSection } from "@/src/features/funders/components/numbers-section";
import { PlatformSection } from "@/src/features/funders/components/platform-section";

export default function FundersPage() {
    return (
        <main className="flex w-full flex-col flex-1 items-center bg-background">
            <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-2">
                <Hero />
                <NumbersSection />
                <PlatformSection />
            </div>
        </main>
    );
}