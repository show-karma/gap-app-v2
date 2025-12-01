import { CheckCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { ProjectV2Response } from "@/types/project";
import { PAGES } from "@/utilities/pages";

interface GrantNotCompletedButtonProps {
  project: ProjectV2Response;
  grantUID: string;
  text?: string;
}

export const GrantNotCompletedButton: React.FC<GrantNotCompletedButtonProps> = ({
  project,
  grantUID,
  text = "Mark as Complete",
}) => {
  return (
    <Link
      href={PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
        project.details?.slug || project.uid,
        grantUID,
        "complete-grant"
      )}
      className="hover:opacity-75 flex flex-row items-center justify-center gap-2 rounded-md bg-green-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-green-700"
    >
      {text}
      <div className="h-5 w-5">
        <CheckCircleIcon className="h-5 w-5" />
      </div>
    </Link>
  );
};
