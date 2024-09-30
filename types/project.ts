export type Contact = {
  id: string;
  name?: string;
  email?: string;
  telegram?: string;
};
export type APIContact = {
  attestationId: string;
  createdAt: string;
  email?: string;
  id: string;
  telegram?: string;
  name?: string;
  updatedAt: string;
};

export interface ProjectReport {
  contact: Contact[];
  createdAt: string;
  title: string;
  description: string | string[];
  categories: string[];
}

export interface ProjectFromList {
  uid: string;
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  noOfGrants: number;
  noOfProjectMilestones: number;
}
