import { ChevronLeftIcon } from "@heroicons/react/20/solid";
import Image from "next/image";
import { Link } from "@/src/components/navigation/Link";
import type { Community } from "@/types/v2/community";
import { communityColors } from "@/utilities/communityColors";
import { PAGES } from "@/utilities/pages";

interface CommunityCoverBarProps {
  community: Community;
}

/**
 * Slim breadcrumb bar for the chrome-free cover pages.
 *
 * Deliberately owns no <h1> — each cover page's own hero is the single h1 on
 * the document. This exists only to identify the community and give a way back
 * to the community explorer.
 */
export const CommunityCoverBar = ({ community }: CommunityCoverBarProps) => {
  const slug = community.details?.slug || community.uid;
  const name = community.details?.name || slug;
  const logoUrl = community.details?.logoUrl || community.details?.imageURL || "";

  // Same lookup order as the community header (components/Community/Header.tsx):
  // some communities are keyed by uid, others by slug. Dropping the slug leg
  // silently greys out every community mapped that way. `bg-foreground` is the
  // themed fallback for a community with no brand colour at all.
  const brandColor =
    communityColors[community.uid?.toLowerCase() || ""] ??
    communityColors[community.details?.slug?.toLowerCase() || ""];

  return (
    <div className="flex w-full max-w-full flex-row items-center gap-3 border-b border-border px-8 py-4 lg:px-24">
      <div
        className="flex h-10 w-10 min-w-10 flex-row items-center justify-center rounded-lg bg-foreground p-1.5"
        style={brandColor ? { backgroundColor: brandColor } : undefined}
      >
        {logoUrl ? (
          <Image
            height={28}
            width={28}
            src={logoUrl}
            alt=""
            className="h-7 w-7 min-h-7 min-w-7 rounded-full border border-white"
          />
        ) : null}
      </div>
      <nav aria-label="Breadcrumb">
        <Link
          href={PAGES.COMMUNITY.ALL_GRANTS(slug)}
          className="flex flex-row items-center gap-1 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          {name}
        </Link>
      </nav>
    </div>
  );
};
