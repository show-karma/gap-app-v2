import type { DonationApiResponse } from "@/hooks/donation/types";

export interface DonationHistoryFilters {
  dateRange?: { from: Date; to: Date };
  tokenSymbol?: string;
  chainId?: number;
  donationType?: "crypto" | "fiat";
}

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
