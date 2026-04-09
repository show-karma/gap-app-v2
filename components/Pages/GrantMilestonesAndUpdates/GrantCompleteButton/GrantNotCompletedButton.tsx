import { CheckCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { PAGES } from "@/utilities/pages";

interface GrantNotCompletedButtonProps {
  project: ProjectResponse;
  grantUID: string;
  text?: string;
}

export const GrantNotCompletedButton: React.FC<GrantNotCompletedButtonProps> = ({
  project,
  grantUID,
  text = "Mark as Complete",
}) => {
  return (
    <Button size="xl" asChild>
      <Link
        href={PAGES.PROJECT.SCREENS.SELECTED_SCREEN(
          project.details?.slug || project.uid,
          grantUID,
          "complete-grant"
        )}
      >
        {text}
        <CheckCircleIcon className="h-5 w-5" />
      </Link>
    </Button>
  );
};
