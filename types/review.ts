export interface BadgeOfficial {
  // TODO: Refactor this name to use Badge instead of BadgeOffical. Only used for now to don't crash the application with the used name 'Badge' for the mocks
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
