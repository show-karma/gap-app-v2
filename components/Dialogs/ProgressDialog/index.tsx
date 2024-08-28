"use client";
import {
  ProgressModalScreen,
  useProgressModalStore,
} from "@/store/modals/progress";
import {
  ArrowLeftCircleIcon,
  ArrowLeftIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { FC, Fragment, ReactNode, useState } from "react";
import { Button } from "../../Utilities/Button";
import { GrantUpdateScreen } from "./GrantUpdateScreen";
import { Transition, Dialog } from "@headlessui/react";
import { ProjectUpdateScreen } from "./ProjectUpdateScreen";
import { MilestoneScreen } from "./MilestoneScreen";
import { MilestoneUpdateScreen } from "./MilestoneUpdateScreen";
import { cn } from "@/utilities/tailwind";

const Box = ({
  icon,
  title,
  description,
  onClick,
  isSelected,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  isSelected: boolean;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      id="box"
      className={cn(
        `flex flex-1 w-full max-w-[300px] h-[230px] flex-col gap-8 justify-center items-center rounded border px-4 py-4 bg-white`,
        isSelected
          ? "border-blue-500 bg-blue-500/5 dark:border-blue-500"
          : "border-gray-400 dark:bg-zinc-900 dark:border-zinc-600"
      )}
    >
      <Image
        src={icon}
        alt={title}
        width={40}
        height={40}
        className="w-10 h-10"
      />
      <div className="flex flex-col gap-0 text-center">
        <h3
          className={cn(
            `text-center text-lg font-bold`,
            isSelected
              ? "text-gray-900 dark:text-zinc-200"
              : " text-gray-900 dark:text-zinc-200"
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            `text-center text-base font-normal`,
            isSelected
              ? "text-gray-900 dark:text-zinc-200"
              : "text-gray-900 dark:text-zinc-200"
          )}
        >
          {description}
        </p>
      </div>
    </button>
  );
};

interface FooterProps {
  selectFn: () => void;
  selectedScreen: ProgressModalScreen;
}

const Footer: FC<FooterProps> = ({ selectFn, selectedScreen }) => {
  const { closeProgressModal } = useProgressModalStore();
  return (
    <div className="flex flex-row gap-4 justify-end">
      <Button
        onClick={() => closeProgressModal()}
        className="border border-black bg-transparent dark:text-white dark:border-white text-black px-5 py-2.5 hover:bg-transparent rounded-sm"
      >
        Cancel
      </Button>
      <Button
        onClick={selectFn}
        disabled={selectedScreen === "menu"}
        className="border border-black bg-black text-white px-10 py-2.5 hover:bg-black rounded-sm"
      >
        Next
      </Button>
    </div>
  );
};

const Menu = () => {
  const [selectedScreen, setSelectedScreen] =
    useState<ProgressModalScreen>("menu");
  const select = (screen: ProgressModalScreen) => {
    if (screen === selectedScreen) {
      setSelectedScreen("menu");
    } else {
      setSelectedScreen(screen);
    }
  };
  const { setProgressModalScreen } = useProgressModalStore();

  const next = () => {
    setProgressModalScreen(selectedScreen);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-row gap-5">
          <Box
            icon="/icons/milestone.png"
            title="Milestone"
            description="Define specific milestone goals for grant achievements."
            onClick={() => select("milestone")}
            isSelected={selectedScreen === "milestone"}
          />
          <Box
            icon="/icons/milestone-update.png"
            title="Milestone Update"
            description="Report completion of a milestone for tracking."
            onClick={() => select("milestone_update")}
            isSelected={selectedScreen === "milestone_update"}
          />
        </div>

        <div className="flex flex-row gap-5">
          <Box
            icon="/icons/project-update.png"
            title="Project Update"
            description="Provide overall project progress, beyond grant specifics."
            onClick={() => select("project_update")}
            isSelected={selectedScreen === "project_update"}
          />
          <Box
            icon="/icons/grant-update.png"
            title="Grant Update"
            description="Share progress updates to keep community informed."
            onClick={() => select("grant_update")}
            isSelected={selectedScreen === "grant_update"}
          />
        </div>
      </div>
      <Footer selectFn={next} selectedScreen={selectedScreen} />
    </div>
  );
};

export const ProgressDialog = () => {
  const {
    isProgressModalOpen: isOpen,
    setIsProgressModalOpen,
    progressModalScreen,
    setProgressModalScreen,
  } = useProgressModalStore();

  const closeModal = () => {
    setIsProgressModalOpen(false);
  };

  const screenToShow: Record<ProgressModalScreen, ReactNode> = {
    menu: <Menu />,
    grant_update: <GrantUpdateScreen />,
    project_update: <ProjectUpdateScreen />,
    milestone: <MilestoneScreen />,
    milestone_update: <MilestoneUpdateScreen />,
  };

  const screenTitleAndDescription: Record<
    ProgressModalScreen,
    {
      title: string;
      description: string;
    }
  > = {
    menu: { title: `What would you like to post today?`, description: "" },
    milestone: {
      title: `Select the grant you wish to update`,
      description: "Define specific milestone goals for grant achievements",
    },
    milestone_update: {
      title: `Craft your Milestone Update`,
      description: "Report completion of a milestone for tracking.",
    },
    project_update: {
      title: `Craft your Project Update`,
      description: "Provide overall project progress, beyond grant specifics.",
    },
    grant_update: {
      title: `Select the grant you wish to update`,
      description: "Share progress updates to keep community informed.",
    },
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full h-max items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl h-max transform overflow-hidden rounded dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-row gap-2 px-4 pt-4 items-center">
                      {progressModalScreen !== "menu" ? (
                        <button onClick={() => setProgressModalScreen("menu")}>
                          <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                      ) : null}

                      <h2 className="text-2xl font-bold dark:text-zinc-200 text-black w-full text-center">
                        {screenTitleAndDescription[progressModalScreen].title}
                      </h2>

                      <button
                        className="p-2 text-black dark:text-white"
                        onClick={() => closeModal()}
                      >
                        <XMarkIcon className="w-6 h-6" />
                      </button>
                    </div>
                    <h3 className="text-zinc-600 w-full text-center">
                      {
                        screenTitleAndDescription[progressModalScreen]
                          .description
                      }
                    </h3>
                  </div>
                  {screenToShow[progressModalScreen]}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
