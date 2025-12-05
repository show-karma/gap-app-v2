// V2 Grant API Response types

export interface GrantDetails {
  title: string;
  amount?: string;
  currency?: string;
  description?: string;
  proposalURL?: string;
  startDate?: string | null;
  payoutAddress?: string;
  questions?: any[];
  selectedTrackIds?: string[];
  isCompleted?: boolean;
  completedAt?: string | null;
  lastDetailsUpdate?: string;
  programId?: string;
  fundUsage?: string;
  data?: {
    title?: string;
    amount?: string;
    description?: string;
    proposalURL?: string;
    startDate?: number;
    payoutAddress?: string;
    questions?: any[];
    programId?: string;
    type?: string;
    selectedTrackIds?: string[];
  };
}

export interface GrantMilestone {
  uid: string;
  refUID?: string;
  type?: string;
  title: string;
  description?: string;
  endsAt?: number;
  startsAt?: number;
  currentStatus?: string;
  statusUpdatedAt?: string;
  statusHistory?: Array<{
    status: string;
    updatedAt: string;
    updatedBy?: string;
    statusReason?: string;
  }>;
  completed?: {
    uid?: string;
    createdAt?: string;
    updatedAt?: string;
    data?: {
      reason?: string;
      proofOfWork?: string;
      deliverables?: string;
    };
  } | null;
  createdAt?: string;
  updatedAt?: string;
  data?: {
    title?: string;
    description?: string;
    endsAt?: number;
    startsAt?: number;
    type?: string;
  };
  // Additional fields for compatibility
  id?: string;
  schemaUID?: string;
  attester?: string;
  recipient?: string;
  revoked?: boolean;
  revocationTime?: number;
  chainID?: number;
}

export interface GrantUpdate {
  uid: string;
  refUID?: string;
  type?: string;
  title: string;
  text?: string;
  proofOfWork?: string;
  completionPercentage?: string;
  currentStatus?: string;
  statusUpdatedAt?: string;
  verified: boolean;
  createdAt?: string;
  data?: {
    title?: string;
    text?: string;
    proofOfWork?: string;
    type?: string;
  };
}

export interface GrantCompleted {
  uid?: string;
  createdAt?: string;
  data?: {
    title?: string;
    text?: string;
    proofOfWork?: string;
    pitchDeckLink?: string;
    demoVideoLink?: string;
    trackExplanations?: Array<{
      trackUID: string;
      explanation: string;
    }>;
  };
}

export interface CommunityDetails {
  name: string;
  description?: string;
  imageURL?: string;
  slug?: string;
}

export interface CommunityResponse {
  uid: string;
  chainID: number;
  details?: CommunityDetails;
}

export interface GrantResponse {
  uid: string;
  chainID: number;
  type?: string;
  refUID?: string;
  projectUID?: string;
  communityUID?: string;
  programId?: string | null;
  originalProjectUID?: string | null;
  recipient?: string;
  attester?: string;
  data?: {
    communityUID?: string;
  };
  details?: GrantDetails;
  milestones: GrantMilestone[];
  updates: GrantUpdate[];
  completed?: GrantCompleted | null;
  community?: CommunityResponse;
  project?: {
    uid: string;
    details?: {
      title?: string;
      slug?: string;
      description?: string;
      logoUrl?: string;
    };
  };
  categories?: string[];
  createdAt?: string;
  updatedAt?: string;
}
