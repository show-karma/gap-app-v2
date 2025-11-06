import { CommunitiesPage } from "@/components/Pages/Communities/CommunitiesPage";
import { layoutTheme } from "@/src/helper/theme";
import { defaultMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";

export const metadata = defaultMetadata;

export default function Communities() {
  return (
    <main className="flex w-full flex-col items-center bg-background">
      <div className={cn(layoutTheme.padding, "flex w-full max-w-[1920px] flex-col gap-2 px-16 py-1 pt-4")}>
        <div className="flex flex-col gap-6 py-4">
          <CommunitiesPage />
        </div>
      </div>
    </main>
  );
} 