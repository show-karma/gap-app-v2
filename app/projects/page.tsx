import { Suspense } from "react";
import {
  ProjectsExplorer,
  ProjectsHeroSection,
  ProjectsLoading,
} from "@/components/Pages/Projects";
import { customMetadata } from "@/utilities/meta";

export const metadata = customMetadata({
  title: "Explore Projects | Karma GAP",
  description:
    "Thousands of projects utilize Karma GAP to track their grants, share project progress and build reputation. Explore projects making a difference.",
});

export default function Projects() {
  return (
    <div className="flex flex-col w-full">
      <ProjectsHeroSection />
      <Suspense fallback={<ProjectsLoading />}>
        <ProjectsExplorer />
      </Suspense>
    </div>
  );
}
