import { NewProjectsPage } from "@/components/Pages/NewProjects";
import { Suspense } from "react";

export default function Projects() {
  return (
    <Suspense>
      <NewProjectsPage />
    </Suspense>
  );
}
