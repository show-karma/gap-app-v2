import type { Metadata } from "next";
import { FundingMapWrapper } from "@/components/Pages/ProgramRegistry/FundingMapWrapper";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
	title: `Karma GAP - Grant Program Aggregator`,
	description: `Find all the funding opportunities across web3 ecosystem.`,
});

const GrantProgramRegistry = () => {
	return <FundingMapWrapper />;
};

export default GrantProgramRegistry;
