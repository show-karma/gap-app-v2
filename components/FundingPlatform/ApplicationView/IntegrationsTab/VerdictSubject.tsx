import { ChatBubbleLeftRightIcon, DocumentTextIcon, FlagIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { cn } from "@/utilities/tailwind";
import type { CommentSubject } from "./verdictSubjects";

// One glyph per thing a Sim can judge, so the application, each milestone
// and the round's deliberation never read as the same list.
const ICONS = {
  application: DocumentTextIcon,
  milestone: FlagIcon,
  deliberation: ChatBubbleLeftRightIcon,
} as const;

export const SubjectIcon: FC<{ kind: CommentSubject["kind"]; className?: string }> = ({
  kind,
  className,
}) => {
  const Icon = ICONS[kind];
  return (
    <Icon
      aria-hidden="true"
      className={cn("h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400", className)}
    />
  );
};

// Heading text for a group of Sim verdicts. Milestones keep the
// "Milestone: <title>" wording the Sims post with, the prefix muted so the
// title carries the weight.
export const SubjectTitle: FC<{ subject: CommentSubject }> = ({ subject }) => {
  if (subject.kind === "application") return <>Application</>;
  if (subject.kind === "deliberation") return <>Round deliberation</>;
  return (
    <>
      <span className="font-normal text-gray-500 dark:text-gray-400">Milestone:</span>{" "}
      {subject.title}
    </>
  );
};
