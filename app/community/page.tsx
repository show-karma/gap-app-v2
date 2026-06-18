import { permanentRedirect } from "next/navigation";
import { PAGES } from "@/utilities/pages";

// Issue #1312: bare `/community` 404'd because the listing lives at `/communities`.
// Permanently redirect `/community` to the community listing.
export default function CommunityIndexPage() {
  permanentRedirect(PAGES.COMMUNITIES);
}
