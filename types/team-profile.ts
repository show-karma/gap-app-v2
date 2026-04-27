import type { ContributorProfile } from "@show-karma/karma-gap-sdk";

export type TeamProfile = ContributorProfile & {
  data: ContributorProfile["data"] & {
    email?: string;
  };
};
