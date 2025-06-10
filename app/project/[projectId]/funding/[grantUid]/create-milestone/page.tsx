"use client";
import { useGrantStore } from "@/store/grant";
import dynamic from "next/dynamic";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { PAGES } from "@/utilities/pages";
import { useProjectStore } from "@/store";

const MilestoneForm = dynamic(
  () => import("@/components/Forms/Milestone").then((mod) => mod.MilestoneForm),
  {
    loading: () => <DefaultLoading />,
  }
);
export default function Page() {
  const { grant } = useGrantStore();
  const project = useProjectStore((state) => state.project);
  if (!grant) {
    return null;
  }
  return (
    <div className="flex flex-row gap-2 items-center">
      <div className="flex flex-1">
        <div className="flex w-full max-w-3xl flex-col gap-6 rounded-md bg-gray-200 dark:bg-zinc-900 px-4 py-6 max-lg:max-w-full">
          <div className="flex w-full flex-row items-center justify-between">
            <h4 className="text-2xl font-bold text-black dark:text-zinc-100">
              Add milestone
            </h4>
            <Link
              href={PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
                project?.details?.data?.slug || project?.uid || "",
                grant.uid,
                "milestones-and-updates"
              )}
              className="bg-transparent p-4 hover:bg-transparent hover:opacity-75 text-black dark:text-zinc-100"
            >
              <XMarkIcon className="h-8 w-8" />
            </Link>
          </div>
          <MilestoneForm grant={grant} />
        </div>
      </div>
    </div>
  );
}
