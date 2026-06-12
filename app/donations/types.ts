import type { DonationApiResponse } from "@/hooks/donation/types";

export interface DonationHistoryItemProps {
  donation: DonationApiResponse;
}

export interface DonationHistoryListProps {
  donations: DonationApiResponse[];
}

export interface DonationGroupProps {
  date: string;
  donations: DonationApiResponse[];
}
