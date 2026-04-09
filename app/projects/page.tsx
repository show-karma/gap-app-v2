import { Suspense } from "react";
import {
  ProjectsExplorer,
  ProjectsHeroSection,
  ProjectsLoading,
  ProjectsStatsSection,
} from "@/components/Pages/Projects";
import { CollectionPageJsonLd } from "@/components/Seo/CollectionPageJsonLd";
import { customMetadata } from "@/utilities/meta";

export const metadata = customMetadata({
  title: "Explore Grant-Funded Projects",
  description:
    "Discover thousands of projects using Karma to track grants, share progress, and build reputation. Explore projects making a difference across funding ecosystems.",
  path: "/projects",
});

export default function Projects() {
  return (
    <div className="flex flex-col w-full">
      <CollectionPageJsonLd
        name="Explore Grant-Funded Projects"
        description="Discover thousands of projects using Karma to track grants, share progress, and build reputation. Explore projects making a difference across funding ecosystems."
        url="/projects"
      />
      <ProjectsHeroSection />
      <Suspense fallback={<ProjectsLoading />}>
        <ProjectsExplorer />
      </Suspense>
      <ProjectsStatsSection />
    </div>
  );
}
