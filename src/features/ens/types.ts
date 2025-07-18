// ENS-related types

export interface ENSData {
  address: string;
  name: string | null;
  avatar: string | null;
  resolvedAt: number;
}

export interface ENSCache {
  [address: string]: ENSData;
}