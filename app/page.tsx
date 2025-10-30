import { defaultMetadata } from "@/utilities/meta";
import { Hero } from "@/src/features/homepage/components/hero";

export const metadata = defaultMetadata;

export default function Index() {
    return (
        <main className="flex w-full flex-col flex-1 items-center bg-white dark:bg-black">
            <div className="flex w-full max-w-[1920px] flex-1 flex-col gap-2">
                <Hero />
            </div>
        </main>
    );
}
