import { customMetadata } from "@/utilities/meta";
import Hero from "./components/Hero";
import FeaturedProjects from "./components/FeaturedProjects";
import BrowseProjects from "./components/BrowseProjects";
import GapByNumbers from "./components/GapByNumbers";

export const metadata = customMetadata({
  title: "Explore projects utilizing Karma GAP",
  description:
    "Thousands of projects utilize GAP to track their grants, share project progress and build reputation. Explore projects making a difference.",
});

export default function ProjectExplorer() {
  return (
    <div className="flex flex-col gap-0 bg-white dark:bg-black min-h-screen">
      <Hero />
      <FeaturedProjects />
      <GapByNumbers />
      <BrowseProjects />
    </div>
  );
}
