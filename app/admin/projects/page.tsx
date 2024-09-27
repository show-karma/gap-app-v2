/* eslint-disable @next/next/no-img-element */
import { defaultMetadata } from "@/utilities/meta";

import { AllProjects } from "@/components/Pages/Admin/AllProjects";

export const metadata = defaultMetadata;

export default function Page() {
  return <AllProjects />;
}
