/* eslint-disable @next/next/no-img-element */
import { AllProjects } from "@/features/admin/components/all-projects";
import { defaultMetadata } from "@/utilities/meta";

export const metadata = defaultMetadata;

export default function Page() {
  return <AllProjects />;
}
