export const donationsByApplicationQuery = (
	chainId: number,
	applicationId: string,
	roundId: string,
) => ({
	query: `
    query Donations(
$chainId: Int!
$applicationId: String!
$roundId: String!
) {
        donations(
            filter: {
                applicationId: { equalTo: $applicationId }
                roundId: { equalTo: $roundId }
                chainId: { equalTo: $chainId }
            }
            orderBy: AMOUNT_IN_USD_DESC
        ) {
            nodeId
            id
            chainId
            roundId
            applicationId
            donorAddress
            recipientAddress
            projectId
            transactionHash
            blockNumber
            tokenAddress
            timestamp
            amount
            amountInUsd
            amountInRoundMatchToken
        }
    }
    `,
	variables: {
		chainId: chainId,
		roundId: roundId,
		applicationId: applicationId,
	},
});
