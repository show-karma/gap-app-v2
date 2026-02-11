import { Suspense } from "react";
import {
  ProjectsExplorer,
  ProjectsHeroSection,
  ProjectsLoading,
  ProjectsStatsSection,
} from "@/components/Pages/Projects";
import { customMetadata } from "@/utilities/meta";

export const metadata = customMetadata({
  title: "Explore Projects",
  description:
    "Thousands of projects utilize Karma GAP to track their grants, share project progress and build reputation. Explore projects making a difference.",
  path: "/projects",
});

export default function Projects() {
  return (
    <div className="flex flex-col w-full">
      <ProjectsHeroSection />
      <Suspense fallback={<ProjectsLoading />}>
        <ProjectsExplorer />
      </Suspense>
      <ProjectsStatsSection />
    </div>
  );
}
