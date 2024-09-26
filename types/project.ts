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
  description: string;
  categories: string[];
}
