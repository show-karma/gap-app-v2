// Tracks-related types

export interface Track {
  id: string;
  name: string;
  description?: string;
  communityId: string;
  color?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TrackFormData {
  name: string;
  description?: string;
  color?: string;
}