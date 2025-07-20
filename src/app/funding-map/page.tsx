import { FundingMapWrapper } from "@/features/program-registry/components/FundingMapWrapper";
import { customMetadata } from "@/utilities/meta";
import { Metadata } from "next";

export const metadata: Metadata = customMetadata({
  title: `Karma GAP - Grant Program Aggregator`,
  description: `Find all the funding opportunities across web3 ecosystem.`,
});

const GrantProgramRegistry = () => {
  return <FundingMapWrapper />;
};

export default GrantProgramRegistry;
