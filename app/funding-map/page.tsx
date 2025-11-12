import { FundingMapWrapper } from "@/components/Pages/ProgramRegistry/FundingMapWrapper";
import { customMetadata } from "@/utilities/meta";
import { Metadata } from "next";
import { PROJECT_NAME } from "@/constants/brand";

export const metadata: Metadata = customMetadata({
  title: `${PROJECT_NAME} - Grant Program Aggregator`,
  description: `Find all the funding opportunities across web3 ecosystem.`,
});

const GrantProgramRegistry = () => {
  return <FundingMapWrapper />;
};

export default GrantProgramRegistry;
