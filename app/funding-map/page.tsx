import type { Metadata } from "next"
import { FundingMapWrapper } from "@/components/Pages/ProgramRegistry/FundingMapWrapper"
import { PROJECT_NAME } from "@/constants/brand"
import { customMetadata } from "@/utilities/meta"

export const metadata: Metadata = customMetadata({
  title: `${PROJECT_NAME} - Grant Program Aggregator`,
  description: `Find all the funding opportunities across web3 ecosystem.`,
})

const GrantProgramRegistry = () => {
  return <FundingMapWrapper />
}

export default GrantProgramRegistry
