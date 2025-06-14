"use client";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import { useProjectData } from "@/hooks/useProject";
import dynamic from "next/dynamic";

const GrantCompletion = dynamic(
  () =>
    import(
      "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/CompleteGrant"
    ).then((mod) => mod.GrantCompletion),
  {
    loading: () => <DefaultLoading />,
  }
);
export default function Page() {
  // Use Zustand store for project data
  const { project: zustandProject } = useProjectData();
  
  return <GrantCompletion />;
}
