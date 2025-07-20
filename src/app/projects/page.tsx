import { NewProjectsPage } from "@/features/projects/components/new-projects";
import { customMetadata } from "@/utilities/meta";
import { Suspense } from "react";

export const metadata = customMetadata({
  title: "Explore projects utilizing Karma GAP",
  description:
    "Thousands of projects utilize GAP to track their grants, share project progress and build reputation. Explore projects making a difference.",
});

export default function Projects() {
  return (
    <Suspense>
      <NewProjectsPage />
    </Suspense>
  );
}
