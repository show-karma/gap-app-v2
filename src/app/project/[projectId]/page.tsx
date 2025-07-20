"use client";
import { ProjectOverviewLoading } from "@/features/projects/components/loading/Overview";
import dynamic from "next/dynamic";

const ProjectPage = dynamic(
  () => import("@/features/projects/components/project-page"),
  {
    loading: () => <ProjectOverviewLoading />,
  }
);

const ProjectPageIndex = () => {
  return <ProjectPage />;
};

export default ProjectPageIndex;
