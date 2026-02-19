import type { Metadata } from "next";
import { CommunitiesPage } from "@/components/Pages/Communities/CommunitiesPage";
import { layoutTheme } from "@/src/helper/theme";
import { customMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = customMetadata({
  title: "Explore Communities",
  description:
    "Browse grant-giving communities and ecosystems on Karma. Discover funding programs, track grantee progress, and find opportunities.",
  path: "/communities",
});

export default function Communities() {
  return (
    <main className="flex w-full flex-col items-center bg-background">
      <div
        className={cn(
          layoutTheme.padding,
          "flex w-full max-w-[1920px] flex-col gap-2 px-16 py-1 pt-4"
        )}
      >
        <div className="flex flex-col gap-6 py-4">
          <CommunitiesPage />
        </div>
      </div>
    </main>
  );
}
