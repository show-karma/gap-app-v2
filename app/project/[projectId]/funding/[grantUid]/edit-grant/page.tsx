"use client";
import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import { useGrantStore } from "@/store/grant";
import dynamic from "next/dynamic";

const NewGrant = dynamic(
  () =>
    import(
      "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant"
    ).then((mod) => mod.NewGrant),
  {
    loading: () => <DefaultLoading />,
  }
);
export default function Page() {
  const { grant } = useGrantStore();
  return <NewGrant grantToEdit={grant} />;
}
