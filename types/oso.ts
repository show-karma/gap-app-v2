export interface OSOCodeMetrics {
	displayName: string;
	developerCount: number;
	contributorCount: number;
	commitCount6Months: number;
	commentCount6Months: number;
	closedIssueCount6Months: number;
	activeDeveloperCount6Months: number;
	contributorCount6Months: number;
	eventSource: string;
	firstCommitDate: string;
	firstCreatedAtDate: string;
	forkCount: number;
	fulltimeDeveloperAverage6Months: number;
	lastCommitDate: string;
	lastUpdatedAtDate: string;
	mergedPullRequestCount6Months: number;
	newContributorCount6Months: number;
	openedIssueCount6Months: number;
	openedPullRequestCount6Months: number;
	releaseCount6Months: number;
	repositoryCount: number;
	projectSource: string;
	starCount: number;
	timeToFirstResponseDaysAverage6Months: number;
	timeToMergeDaysAverage6Months: number;
}

export interface OSOOnchainMetrics {
	activeContractCount90Days: number;
	addressCount: number;
	addressCount90Days: number;
	daysSinceFirstTransaction: number;
	displayName: string;
	eventSource: string;
	gasFeesSum: string;
	gasFeesSum6Months: string;
	highActivityAddressCount90Days: number;
	lowActivityAddressCount90Days: number;
	mediumActivityAddressCount90Days: number;
	multiProjectAddressCount90Days: number;
	newAddressCount90Days: number;
	projectId: string;
	projectName: string;
	projectNamespace: string;
	projectSource: string;
	returningAddressCount90Days: number;
	transactionCount: number;
	transactionCount6Months: number;
}

export interface OSOMetricsResponse {
	oso_codeMetricsByProjectV1: OSOCodeMetrics[];
	oso_onchainMetricsByProjectV1: OSOOnchainMetrics[];
}
