import React from "react";
import { AddProgramWrapper } from "@/features/program-registry/components/AddProgramWrapper";
import { customMetadata } from "@/lib/metadata/meta";

export const metadata = customMetadata({
  title: "Karma GAP - Grant Program Registry",
  description:
    "Comprehensive list of all the grant programs in the web3 ecosystem.",
});

export default function AddProgramPage() {
  return <AddProgramWrapper />;
}
