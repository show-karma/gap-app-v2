"use client";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";

const AddProgram = dynamic(
  () =>
    import("@/features/program-registry/components/AddProgram").then(
      (mod) => mod.default
    ),
  {
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner />
      </div>
    ),
  }
);
export const AddProgramWrapper = () => {
  return <AddProgram />;
};
