import { Suspense } from "react";
import {
  ProjectsExplorer,
  ProjectsHeroSection,
  ProjectsLoading,
  ProjectsStatsSection,
} from "@/components/Pages/Projects";
import { customMetadata } from "@/utilities/meta";

export const metadata = customMetadata({
  title: "Explore Grant-Funded Projects",
  description:
    "Discover thousands of projects using Karma to track grants, share progress, and build reputation. Explore projects making a difference across Web3 ecosystems.",
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
