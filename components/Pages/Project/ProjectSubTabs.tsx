import { useState } from "react";
import { EndorsementList } from "../ProgramRegistry/EndorsementList";
import { ProjectFeed } from "@/components/ProjectFeed";
import { useActivityTabStore } from "@/store/activityTab";

const SelectedButton = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className="text-base py-4 mx-4 px-2.5 text-[#30374F] dark:text-zinc-300 font-bold border-b-2 border-b-[#155EEF]"
    >
      {children}
    </button>
  );
};
const UnselectedButton = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className="text-base py-4 mx-4 px-2.5 text-[#4B5565] dark:text-zinc-400 font-normal border-b border-b-transparent"
    >
      {children}
    </button>
  );
};

export const ProjectSubTabs = () => {
  const { activityTab, setActivityTab } = useActivityTabStore();

  return (
    <div className="flex flex-col border border-zinc-300 rounded-xl w-full">
      <div className="flex flex-row gap-1 justify-center items-center border-b border-b-zinc-300">
        {activityTab === "project-feed" ? (
          <SelectedButton
            onClick={() => {
              setActivityTab("project-feed");
            }}
          >
            Project Feed
          </SelectedButton>
        ) : (
          <UnselectedButton
            onClick={() => {
              setActivityTab("project-feed");
            }}
          >
            Project Feed
          </UnselectedButton>
        )}
        {activityTab === "endorsements" ? (
          <SelectedButton
            onClick={() => {
              setActivityTab("endorsements");
            }}
          >
            Endorsements
          </SelectedButton>
        ) : (
          <UnselectedButton
            onClick={() => {
              setActivityTab("endorsements");
            }}
          >
            Endorsements
          </UnselectedButton>
        )}
      </div>
      {activityTab === "endorsements" ? <EndorsementList /> : <ProjectFeed />}
    </div>
  );
};
