"use client";
import { useGrantStore } from "@/store/grant";
import dynamic from "next/dynamic";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";

const NewMilestone = dynamic(
  () =>
    import(
      "@/components/Pages/GrantMilestonesAndUpdates/screens/NewMilestone"
    ).then((mod) => mod.NewMilestone),
  {
    loading: () => <DefaultLoading />,
  }
);
export default function Page() {
  const { grant } = useGrantStore();
  if (!grant) {
    return null;
  }
  return <NewMilestone grant={grant} />;
}
