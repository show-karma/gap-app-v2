import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store";
import { useProgressModalStore } from "@/store/modals/progress";
import { PAGES } from "@/utilities/pages";

export const NoGrant = () => {
  const { project } = useProjectStore();
  const router = useRouter();
  const { closeProgressModal } = useProgressModalStore();

  if (!project) return null;

  return (
    <div
      className="flex h-96 border-spacing-4 flex-col items-center justify-center gap-5 rounded border border-blue-600 dark:bg-zinc-900 bg-[#EEF4FF] px-8"
      style={{
        border: "dashed 2px #155EEF",
      }}
    >
      <p className="w-full text-center text-lg break-words h-max font-semibold text-black dark:text-zinc-200">
        Go ahead and add your first funding
      </p>
      <button
        type="button"
        className="items-center flex flex-row justify-center gap-2 rounded border border-blue-600 bg-blue-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-blue-600"
        onClick={() => {
          router.push(PAGES.PROJECT.SCREENS.NEW_GRANT(project.details?.data.slug || project.uid));
          router.refresh();
          closeProgressModal();
        }}
      >
        <img src="/icons/plus.svg" alt="Add" className="relative h-5 w-5" />
        Add Funding
      </button>
    </div>
  );
};
