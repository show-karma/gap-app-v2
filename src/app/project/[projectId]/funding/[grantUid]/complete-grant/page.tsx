"use client";
import { DefaultLoading } from "@/components/ui/default-loading";
import dynamic from "next/dynamic";

const GrantCompletion = dynamic(
  () =>
    import("@/features/grants/components/milestones/CompleteGrant").then(
      (mod) => mod.GrantCompletion
    ),
  {
    loading: () => <DefaultLoading />,
  }
);
export default function Page() {
  return <GrantCompletion />;
}
