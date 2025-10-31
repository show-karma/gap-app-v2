import { Hero } from "@/src/features/funders/components/hero";

export default function FundersPage() {
    return (
        <main className="flex w-full flex-col flex-1 items-center bg-background">
            <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-2">
                <Hero />
            </div>
        </main>
    );
}