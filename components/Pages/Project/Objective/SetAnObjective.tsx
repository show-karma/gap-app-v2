import { Button } from "@/components/Utilities/Button";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import Link from "next/link";
import { useParams } from "next/navigation";

export const SetAnObjective = () => {
  const { projectId } = useParams();
  return (
    <div className="flex flex-col border border-dashed border-brand-blue p-6 gap-4 rounded-xl w-full bg-[#F5F8FF] dark:bg-blue-950/20">
      <div className="flex flex-col gap-4 items-start justify-start">
        <p className="text-zinc-900 dark:text-zinc-300 font-normal text-xl">
          {MESSAGES.PROJECT.OBJECTIVE.TITLE}
        </p>
        <p className="text-[#1D2939] dark:text-zinc-300 p-4 border border-[#DCDFEA] rounded-md font-normal text-base bg-white dark:bg-zinc-800">
          {MESSAGES.PROJECT.OBJECTIVE.TEXT}
        </p>
      </div>
      <Link
        href={PAGES.PROJECT.ROADMAP.CREATE_OBJECTIVE(projectId as string)}
        className="w-max"
      >
        <Button className="px-5 py-3 border w-max border-brand-blue bg-transparent text-brand-blue font-semibold text-sm hover:bg-brand-blue/10">
          Create
        </Button>
      </Link>
    </div>
  );
};
