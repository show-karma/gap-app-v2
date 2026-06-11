import { permanentRedirect } from "next/navigation";
import { PAGES } from "@/utilities/pages";

/**
 * Bare `/community` has no content of its own — the community listing lives at
 * `/communities`. Without this route the URL 404s, so permanently redirect it to the
 * listing. Uses `permanentRedirect` (308) since `/community` is not intended to ever
 * become a real page; switch to `redirect` if that changes.
 */
export default function CommunityIndexPage(): never {
  permanentRedirect(PAGES.COMMUNITIES);
}
