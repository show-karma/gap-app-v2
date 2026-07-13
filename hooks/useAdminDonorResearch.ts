"use client";

import { useQuery } from "@tanstack/react-query";
import { type ListAdvisorsOptions, listAdvisors } from "@/services/donor-research-admin.service";
import type { AdminAdvisorsList } from "@/types/donor-research";

const adminAdvisorsQueryKey = (options: ListAdvisorsOptions = {}) =>
  ["donor-research", "admin", "advisors", options] as const;

/** Staff-only: paginated list of advisors with their donors + report links. */
export function useAdminAdvisors(options: ListAdvisorsOptions = {}) {
  return useQuery<AdminAdvisorsList>({
    queryKey: adminAdvisorsQueryKey(options),
    queryFn: () => listAdvisors(options),
  });
}
