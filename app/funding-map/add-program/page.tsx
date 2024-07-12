import React, { Suspense } from "react";
import { defaultMetadata } from "@/utilities/meta";
import AddProgram from "@/components/Pages/ProgramRegistry/AddProgram";
import { Spinner } from "@/components/Utilities/Spinner";

export const metadata = {
  ...defaultMetadata,
  title: "Karma GAP - Grant Program Registry",
  description:
    "Comprehensive list of all the grant programs in the web3 ecosystem.",
};

export default function AddProgramPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AddProgram />
    </Suspense>
  );
}
