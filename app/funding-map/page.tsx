import { FundingMapWrapper } from "@/components/Pages/ProgramRegistry/FundingMapWrapper";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: `Karma GAP - Grant Program Aggregator`,
  description: `Find all the funding opportunities across web3 ecosystem.`,
};

const GrantProgramRegistry = () => {
  return <FundingMapWrapper />;
};

export default GrantProgramRegistry;
