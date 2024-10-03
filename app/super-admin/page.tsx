"use client";
import { useOwnerStore } from "@/store";
import { PAGES } from "@/utilities/pages";

export default function page() {
  const isOwner = useOwnerStore((state) => state.isOwner);
  return isOwner ? (
    <div className="m-12 flex gap-8 flex-row max-lg:flex-col-reverse w-full ">
      <div className="flex flex-row flex-wrap gap-8">
        <a href={PAGES.STATS}>
          <button className="px-10 py-8 bg-yellow-200 rounded-md  transition-all ease-in-out duration-200 dark:bg-yellow-900">
            Stats
          </button>
        </a>
        <a href={PAGES.ADMIN.COMMUNITY_STATS}>
          <button className="px-10 py-8 bg-blue-200 rounded-md  transition-all ease-in-out duration-200 dark:bg-blue-900">
            Community Stats
          </button>
        </a>
        <a href={PAGES.ADMIN.PROJECTS}>
          <button className="px-10 py-8 bg-yellow-200 rounded-md  transition-all ease-in-out duration-200 dark:bg-yellow-900">
            Projects
          </button>
        </a>
      </div>
    </div>
  ) : (
    <div className="flex w-full items-center justify-center m-12">
      <p>
        You are account isnt super admin.Only Super admin can view this page
      </p>
    </div>
  );
}
