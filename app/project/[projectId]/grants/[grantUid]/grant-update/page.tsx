"use client";
import { useGrantStore } from "@/store/grant";
import dynamic from "next/dynamic";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";

const NewGrantUpdate = dynamic(
  () =>
    import(
      "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrantUpdate"
    ).then((mod) => mod.NewGrantUpdate),
  {
    loading: () => <DefaultLoading />,
  }
);
export default function Page() {
  const { grant } = useGrantStore();
  if (!grant) {
    return null;
  }
  return <NewGrantUpdate grant={grant} />;
}
