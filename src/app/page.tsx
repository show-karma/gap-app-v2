import { defaultMetadata } from "@/utilities/meta";
import { Presentation } from "@/features/home/components/Presentation";
import { NewFeatureBanner } from "@/features/home/components/NewFeatureBanner";
import { Communities } from "@/features/home/components/Communities";
import { WhatIsSolving } from "@/features/home/components/WhatIsSolving";

export const metadata = defaultMetadata;

export default function Index() {
  return (
    <main className="flex w-full flex-col items-center bg-white dark:bg-black">
      <div className="flex w-full max-w-[1920px] flex-col gap-2 px-16 py-1 pt-4 max-lg:px-8 max-md:px-4">
        <NewFeatureBanner />
        <div className="flex flex-col gap-16 py-4">
          <Presentation />
          <Communities />
          <WhatIsSolving />
        </div>
      </div>
    </main>
  );
}
