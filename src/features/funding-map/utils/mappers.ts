/**
 * Build URL query string from params
 */
export function buildQueryString(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  categories?: string[];
  ecosystems?: string[];
  networks?: string[];
  grantTypes?: string[];
  onlyOnKarma?: boolean;
  communityUid?: string;
  organization?: string;
}): string {
  const searchParams = new URLSearchParams();

  if (params.pageSize) {
    searchParams.set("limit", params.pageSize.toString());
  }

  if (params.page) {
    searchParams.set("page", params.page.toString());
  }

  if (params.search) {
    searchParams.set("name", params.search);
  }

  if (params.status) {
    searchParams.set("status", params.status.toLowerCase());
  }

  if (params.categories?.length) {
    searchParams.set("categories", params.categories.join(","));
  }

  if (params.ecosystems?.length) {
    searchParams.set("ecosystems", params.ecosystems.join(","));
  }

  if (params.networks?.length) {
    searchParams.set("networks", params.networks.join(","));
  }

  if (params.grantTypes?.length) {
    searchParams.set("grantTypes", params.grantTypes.join(","));
  }

  if (params.onlyOnKarma) {
    searchParams.set("onlyOnKarma", "true");
  }

  if (params.communityUid) {
    searchParams.set("communityUid", params.communityUid);
  }

  if (params.organization) {
    searchParams.set("organization", params.organization);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}
