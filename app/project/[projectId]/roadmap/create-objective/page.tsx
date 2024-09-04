import { ProjectObjectiveForm } from "@/components/Forms/ProjectObjective";
import { PAGES } from "@/utilities/pages";
import { XMarkIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

export default function CreateObjective({
  params,
}: {
  params: { projectId: string };
}) {
  const { projectId } = params;
  return (
    <div className="flex flex-col justify-center items-center py-11 w-full">
      <div className="flex flex-col gap-8 justify-center items-start max-w-3xl w-full  p-5 border border-zinc-200 rounded-md">
        <div className="flex flex-row gap-2 w-full justify-between items-center">
          <h1 className="text-2xl font-bold">Create Objective</h1>
          <Link href={PAGES.PROJECT.ROADMAP.ROOT(projectId as string)}>
            <XMarkIcon className="w-6 h-6" />
          </Link>
        </div>
        <ProjectObjectiveForm />
      </div>
    </div>
  );
}
