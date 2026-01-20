"use client";
import dynamic from "next/dynamic";
import { ProjectOverviewLoading } from "@/components/Pages/Project/Loading/Overview";

const ProjectProfilePage = dynamic(
  () =>
    import("@/components/Pages/Project/v2/ProjectProfilePage").then(
      (mod) => mod.ProjectProfilePage
    ),
  {
    loading: () => <ProjectOverviewLoading />,
  }
);

const ProjectPageIndex = () => {
  return <ProjectProfilePage />;
};

export default ProjectPageIndex;
