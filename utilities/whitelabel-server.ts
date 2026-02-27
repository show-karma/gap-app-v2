import { headers } from "next/headers";
import { getWhitelabelBySlug, type WhitelabelDomain } from "./whitelabel-config";

export interface WhitelabelContext {
  isWhitelabel: boolean;
  communitySlug: string | null;
  config: WhitelabelDomain | null;
}

export async function getWhitelabelContext(): Promise<WhitelabelContext> {
  const headersList = await headers();
  const isWhitelabel = headersList.get("x-is-whitelabel") === "true";
  const communitySlug = headersList.get("x-community-slug");
  const config = communitySlug ? getWhitelabelBySlug(communitySlug) : null;

  return { isWhitelabel, communitySlug, config };
}
