"use client";
import { ProjectOverviewLoading } from "@/features/projects/components/Loading/Overview";
import dynamic from "next/dynamic";

const ProjectPage = dynamic(
  () => import("@/features/projects/components/ProjectPage"),
  {
    loading: () => <ProjectOverviewLoading />,
  }
);

const ProjectPageIndex = () => {
  return <ProjectPage />;
};

export default ProjectPageIndex;
