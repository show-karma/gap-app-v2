import type { ApplicationStatus } from "@/types/whitelabel-entities";

/** The status chips on the browse page, in display order. */
export const statusOptions: Array<{
  value: ApplicationStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under review" },
  { value: "revision_requested", label: "Needs info" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Declined" },
];
