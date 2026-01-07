/**
 * Represents a grant within a community context
 * Used for community grants listing (edit-categories page)
 */
export interface CommunityGrant {
  uid: string;
  programId: string;
  title: string;
  description: string;
  projectUID: string;
  projectTitle: string;
  projectSlug: string;
  categories: string[];
}
