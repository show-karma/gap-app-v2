export interface Badge {
  name: string;
  description: string;
  metadata: string; // Image IPFS
  data: string;
}

export interface GrantStory {
  timestamp: number;
  txUID: string;
  badgeIds: string[];
  badgeScores: number[];
  averageScore: number;
}

export enum ReviewMode {
  READ = "READ",
  WRITE = "WRITE",
}
