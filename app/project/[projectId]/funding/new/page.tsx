import { Suspense } from "react";
import { NewGrant } from "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant";
import { GrantsLayout } from "@/components/Pages/Project/Grants/Layout";
import { ProjectGrantsLayoutLoading } from "@/components/Pages/Project/Loading/Grants/Layout";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ProjectGrantsLayoutLoading>
          <DefaultLoading />
        </ProjectGrantsLayoutLoading>
      }
    >
      <GrantsLayout>
        <NewGrant />
      </GrantsLayout>
    </Suspense>
  );
}
