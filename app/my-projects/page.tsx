import MyProjects from "@/components/Pages/MyProjects";
import { Spinner } from "@/components/Utilities/Spinner";
import { defaultMetadata } from "@/utilities/meta";
import { Suspense } from "react";

export const metadata = defaultMetadata;

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <MyProjects />
    </Suspense>
  );
}
