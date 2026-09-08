import { permanentRedirect } from "next/navigation";
import { PAGES } from "@/utilities/pages";

// Block class. This segment only issues a permanentRedirect, so there is
// nothing to prefetch into a shell and an instant navigation would paint an
// empty page before the redirect resolved. Only legal with `cacheComponents`
// enabled.
export const instant = false;

export default async function CommunityPayoutsPage(props: {
  params: Promise<{ communityId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { communityId } = await props.params;
  const sp = props.searchParams ? await props.searchParams : {};
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    }
  }
  const query = qs.toString();
  permanentRedirect(`${PAGES.ADMIN.CONTROL_CENTER(communityId)}${query ? `?${query}` : ""}`);
}
