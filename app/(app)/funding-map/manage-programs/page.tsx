/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import ManageProgramsWrapper from "@/components/Pages/ProgramRegistry/ManageProgramsWrapper";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Manage Your Funding Programs",
  description: "Manage and update your funding programs in the web3 grant program registry.",
  path: "/funding-map/manage-programs",
});

const GrantProgramRegistry = () => {
  return <ManageProgramsWrapper />;
};

export default GrantProgramRegistry;
