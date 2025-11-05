import { NewProjectsPage } from "@/components/Pages/NewProjects";
import { customMetadata } from "@/utilities/meta";
import { Suspense } from "react";
import { PROJECT_NAME } from "@/constants/brand";

export const metadata = customMetadata({
  title: `Explore projects utilizing ${PROJECT_NAME}`,
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
