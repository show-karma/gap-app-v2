"use client";

import { FolderPlusIcon, PlayCircleIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import type { FC } from "react";

const ProjectDialog = dynamic(
  () => import("@/components/Dialogs/ProjectDialog/index").then((mod) => mod.ProjectDialog),
  { ssr: false }
);

interface EmptyProjectsStateProps {
  onStartWalkthrough: () => void;
}

const ProjectsIllustration: FC = () => (
  <svg
    width="200"
    height="160"
    viewBox="0 0 200 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-gray-200 dark:text-gray-700"
  >
    {/* Background folder */}
    <rect
      x="30"
      y="50"
      width="140"
      height="90"
      rx="8"
      className="fill-gray-100 dark:fill-gray-800 stroke-gray-200 dark:stroke-gray-700"
      strokeWidth="2"
    />
    {/* Folder tab */}
    <path
      d="M30 58C30 53.5817 33.5817 50 38 50H70L80 40H162C166.418 40 170 43.5817 170 48V50H30V58Z"
      className="fill-gray-100 dark:fill-gray-800 stroke-gray-200 dark:stroke-gray-700"
      strokeWidth="2"
    />
    {/* Document 1 */}
    <rect
      x="55"
      y="70"
      width="50"
      height="60"
      rx="4"
      className="fill-white dark:fill-gray-700 stroke-gray-300 dark:stroke-gray-600"
      strokeWidth="1.5"
    />
    <rect
      x="62"
      y="80"
      width="36"
      height="3"
      rx="1.5"
      className="fill-blue-200 dark:fill-blue-900"
    />
    <rect
      x="62"
      y="88"
      width="28"
      height="3"
      rx="1.5"
      className="fill-gray-200 dark:fill-gray-600"
    />
    <rect
      x="62"
      y="96"
      width="32"
      height="3"
      rx="1.5"
      className="fill-gray-200 dark:fill-gray-600"
    />
    <rect
      x="62"
      y="104"
      width="20"
      height="3"
      rx="1.5"
      className="fill-gray-200 dark:fill-gray-600"
    />
    {/* Document 2 */}
    <rect
      x="95"
      y="65"
      width="50"
      height="60"
      rx="4"
      className="fill-white dark:fill-gray-700 stroke-gray-300 dark:stroke-gray-600"
      strokeWidth="1.5"
    />
    <rect
      x="102"
      y="75"
      width="36"
      height="3"
      rx="1.5"
      className="fill-teal-200 dark:fill-teal-900"
    />
    <rect
      x="102"
      y="83"
      width="28"
      height="3"
      rx="1.5"
      className="fill-gray-200 dark:fill-gray-600"
    />
    <rect
      x="102"
      y="91"
      width="32"
      height="3"
      rx="1.5"
      className="fill-gray-200 dark:fill-gray-600"
    />
    <rect
      x="102"
      y="99"
      width="24"
      height="3"
      rx="1.5"
      className="fill-gray-200 dark:fill-gray-600"
    />
    {/* Plus circle */}
    <circle cx="160" cy="45" r="18" className="fill-blue-500 dark:fill-blue-600" />
    <path d="M160 37V53M152 45H168" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const EmptyProjectsState: FC<EmptyProjectsStateProps> = ({ onStartWalkthrough }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-lg w-full text-center">
        {/* Illustration */}
        <div className="flex justify-center mb-8">
          <ProjectsIllustration />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
          Start Your First Project
        </h2>

        {/* Description */}
        <p className="text-base text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Track your grants, share milestones and updates, showcase your impact, build your
          reputation, and attract more funding.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <ProjectDialog
            buttonElement={{
              text: "Create Project",
              icon: <FolderPlusIcon className="w-5 h-5" />,
              iconSide: "left",
              styleClass:
                "inline-flex items-center justify-center gap-2 px-6 py-3 h-auto bg-brand-darkblue dark:bg-zinc-700 hover:opacity-75 text-white font-semibold rounded-md transition-all duration-200 w-full sm:w-auto",
            }}
          />
          <button
            onClick={onStartWalkthrough}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-md transition-all duration-200 w-full sm:w-auto"
          >
            <PlayCircleIcon className="w-5 h-5" />
            Take a Tour
          </button>
        </div>

        {/* Helpful tip */}
        <p className="mt-8 text-sm text-gray-500 dark:text-gray-500">
          Already have a project?{" "}
          <span className="text-blue-600 dark:text-blue-400">
            Use the search bar above to find it.
          </span>
        </p>
      </div>
    </div>
  );
};

export default EmptyProjectsState;
