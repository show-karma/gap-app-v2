/* eslint-disable @next/next/no-img-element */
import { defaultMetadata } from "@/utilities/meta";

import { AllProjects } from "@/features/admin/components/AllProjects";

export const metadata = defaultMetadata;

export default function Page() {
  return <AllProjects />;
}
