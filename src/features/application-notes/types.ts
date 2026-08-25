export interface ApplicationNote {
  id: string;
  applicationId: string;
  programId: string;
  content: string;
  updatedByAddress: string;
  updatedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}
