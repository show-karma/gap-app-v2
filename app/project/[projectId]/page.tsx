"use client";
import { ProjectOverviewLoading } from "@/components/Pages/Project/Loading/Overview";
import dynamic from "next/dynamic";

const ProjectPage = dynamic(
  () => import("@/components/Pages/Project/ProjectPage"),
  {
    loading: () => <ProjectOverviewLoading />,
  }
);

const ProjectPageIndex = () => {
  return <ProjectPage />;
};

export default ProjectPageIndex;
