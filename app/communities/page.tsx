import { CommunitiesPage } from "@/components/Pages/Communities/CommunitiesPage";
import { defaultMetadata } from "@/utilities/meta";

export const metadata = defaultMetadata;

export default function Communities() {
  return (
    <main className="flex w-full flex-col items-center bg-white dark:bg-black">
      <div className="flex w-full max-w-[1920px] flex-col gap-2 px-16 py-1 pt-4 max-lg:px-8 max-md:px-4">
        <div className="flex flex-col gap-6 py-4">
          <CommunitiesPage />
        </div>
      </div>
    </main>
  );
} 