/* eslint-disable @next/next/no-img-element */
import { useProjectStore } from "@/store";

import { useQueryState } from "nuqs";
import { useRouter, useSearchParams } from "next/navigation";
import { ProjectUpdateForm } from "@/components/Forms/ProjectUpdate";

export const ProjectUpdateFormBlock = () => {
  const [, changeTab] = useQueryState("tab");
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const project = useProjectStore((state) => state.project);
  const updateBeingEdited = editId
    ? project?.updates.find((update) => update.uid === editId)
    : null;
  const router = useRouter();

  const handleClose = () => {
    // Navigate to the updates tab without the editId parameter
    const url = new URL(window.location.href);
    url.searchParams.delete("editId");
    url.searchParams.set("tab", "updates");
    router.push(url.toString());
  };

  return (
    <div className="flex w-full flex-col gap-6 rounded-md bg-gray-200 dark:bg-zinc-900  px-4 py-6 max-lg:max-w-full">
      <div className="flex w-full flex-row justify-between">
        <h4 className="text-2xl font-bold text-black dark:text-zinc-100">
          {updateBeingEdited
            ? `Editing ${updateBeingEdited.data.title}`
            : "Post a project activity"}
        </h4>
        <button
          className="bg-transparent p-4 hover:bg-transparent hover:opacity-75"
          onClick={handleClose}
        >
          <img src="/icons/close.svg" alt="Close" className="h-5 w-5" />
        </button>
      </div>
      <ProjectUpdateForm afterSubmit={handleClose} />
    </div>
  );
};
