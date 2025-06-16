import MilestonesAndUpdates from "@/components/Pages/Grants/MilestonesAndUpdates";
import { Suspense } from "react";
import { ProjectGrantsMilestonesAndUpdatesLoading } from "@/components/Pages/Project/Loading/Grants/MilestonesAndUpdate";

const Page = () => {
  return (
    <Suspense fallback={<ProjectGrantsMilestonesAndUpdatesLoading />}>
      <MilestonesAndUpdates />
    </Suspense>
  );
};

export default Page;
