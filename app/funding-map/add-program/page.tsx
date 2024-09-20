import React from "react";
import { defaultMetadata } from "@/utilities/meta";
import { AddProgramWrapper } from "@/components/Pages/ProgramRegistry/AddProgramWrapper";

export const metadata = {
  ...defaultMetadata,
  title: "Karma GAP - Grant Program Registry",
  description:
    "Comprehensive list of all the grant programs in the web3 ecosystem.",
};

export default function AddProgramPage() {
  return <AddProgramWrapper />;
}
