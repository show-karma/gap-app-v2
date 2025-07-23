export type SortByOptions =
	| "createdAt"
	| "updatedAt"
	| "title"
	| "noOfGrants"
	| "noOfProjectMilestones";

export type SortOrder = "asc" | "desc";

export const sortOptions: Record<SortByOptions, string> = {
	createdAt: "Recently Added",
	updatedAt: "Recently Updated",
	title: "Title",
	noOfGrants: "No. of Grants",
	noOfProjectMilestones: "No. of Roadmap items",
};
