"use client";
import dynamic from "next/dynamic";
import { ProjectOverviewLoading } from "@/components/Pages/Project/Loading/Overview";

const ProjectPage = dynamic(() => import("@/components/Pages/Project/ProjectPage"), {
  loading: () => <ProjectOverviewLoading />,
});

const ProjectPageIndex = () => {
  return <ProjectPage />;
};

export default ProjectPageIndex;
