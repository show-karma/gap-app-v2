"use client";
import { DefaultLoading } from "@/components/ui/default-loading";
import { useGrantStore } from "@/features/grants/lib/store";
import dynamic from "next/dynamic";

const NewGrant = dynamic(
  () =>
    import("@/features/grants/components/new-grant").then(
      (mod) => mod.NewGrant
    ),
  {
    loading: () => <DefaultLoading />,
  }
);
export default function Page() {
  const { grant } = useGrantStore();

  return <NewGrant grantToEdit={grant} />;
}
