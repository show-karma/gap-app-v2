export const getProgramsOwnedByAddress = (
  chainIds: number[],
  category: string,
  withGrants: boolean = false
) => ({
  query: `
          query Projects($filter: ProjectFilter, $orderBy: [ProjectsOrderBy!]) {
              projects(filter: $filter, orderBy: $orderBy) {
                  id
                  chainId
                  name
                  createdAtBlock
                  createdByAddress  
                  metadata
                  tags
                  updatedAtBlock
                  projectNumber
                  projectType
                  registryAddress
                  anchorAddress
                  ${
                    withGrants
                      ? `rounds {
                    chainId
                    applicationMetadata
                    roundMetadata
                    createdAtBlock
                    fundedAmount
                    fundedAmountInUsd
                    donationsStartTime
                    donationsEndTime
                    createdByAddress
                    id
                    matchAmount
                    matchAmountInUsd
                    matchTokenAddress
                    matchingDistribution
                    strategyId
                    strategyName
                    tags
                    totalDonationsCount
                    uniqueDonorsCount
                    updatedAtBlock
                    totalAmountDonatedInUsd
                    strategyAddress
                    readyForPayoutTransaction
                    applicationsStartTime
                    applicationsEndTime
                    adminRole
                  }`
                      : ""
                  }
              }
          }
      `,
  variables: {
    orderBy: "CREATED_AT_BLOCK_DESC",
    filter: {
      chainId: {
        in: chainIds,
      },
      metadata: {
        contains: {
          category: category,
        },
      },
    },
  },
})
