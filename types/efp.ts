export interface EfpUserStats {
  followers_count: number;
  following_count: number;
}

export interface EfpFollowingRecord {
  version: number;
  record_type: "address";
  data: string;
  address: string;
  tags: string[];
}

export interface EfpFollowerRecord {
  efp_list_nft_token_id: string;
  address: string;
  tags: string[];
  is_following: boolean;
  is_blocked: boolean;
  is_muted: boolean;
  updated_at: string;
}

export interface EfpCommonFollower {
  address: string;
  name?: string;
  avatar?: string;
  header?: string;
  mutuals_rank: number | string;
}

export interface EfpCommonFollowersResponse {
  results: EfpCommonFollower[];
  length: number;
}

export interface EfpFollowingResponse {
  following: EfpFollowingRecord[];
}

export interface EfpFollowerStateResponse {
  addressUser: string;
  addressFollower: string;
  state: { follow: boolean; block: boolean; mute: boolean };
}

export interface EfpStatsResult {
  address: string;
  followers_count: number;
  following_count: number;
}
