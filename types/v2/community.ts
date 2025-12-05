// V2 Community API Response types

export interface CommunityDetails {
  name: string;
  description?: string;
  imageURL?: string;
  logoUrl?: string;
  slug?: string;
  links?: Array<{
    url: string;
    type: string;
  }>;
}

export interface Community {
  uid: string;
  chainID: number;
  details?: CommunityDetails;
  slug?: string;
  name?: string;
  imageURL?: string;
  createdAt?: string;
  updatedAt?: string;
}
