import { chosenCommunities } from "./chosenCommunities";
import { PAGES } from "./pages";

export interface MarqueeLogo {
  text: string;
  image: {
    light: string;
    dark: string;
  };
  href?: string;
}

/**
 * Communities held back from the homepage marquee. They stay in
 * `chosenCommunities`, so their community pages, case-study cards and
 * `/<slug>` redirects are untouched — they just no longer ride the carousel.
 */
const EXCLUDED_SLUGS = new Set(["lisk", "livepeer", "scroll"]);

/**
 * A partner we show by logo alone. These are not Karma communities, so there
 * is no community page to link a pill at.
 */
const PARTNER_LOGOS = {
  sanFranciscoFoundation: {
    text: "San Francisco Foundation",
    image: {
      light: "/logos/karma-sff.png",
      dark: "/logos/karma-sff.png",
    },
  },
  trinityCenter: {
    text: "Trinity Center",
    image: {
      light: "/logos/karma-trinity-center.png",
      dark: "/logos/karma-trinity-center.png",
    },
  },
} satisfies Record<string, MarqueeLogo>;

type MarqueeLeadEntry = { communitySlug: string } | MarqueeLogo;

/**
 * The opening run of the carousel, in order. Everything not named here follows
 * in `chosenCommunities` order, so the first faces a visitor sees are the ones
 * we chose rather than whichever community happens to sit at the top of the list.
 */
const MARQUEE_LEAD: MarqueeLeadEntry[] = [
  { communitySlug: "unicef" },
  PARTNER_LOGOS.sanFranciscoFoundation,
  PARTNER_LOGOS.trinityCenter,
  { communitySlug: "filecoin" },
];

/**
 * Logos for the homepage hero carousel: the lead run above, then the remaining
 * chosen communities. Forces the production community list so the marquee looks
 * the same on staging.
 */
export const homepageMarqueeLogos = (): MarqueeLogo[] => {
  const communities = chosenCommunities(true).filter(
    (community) => !EXCLUDED_SLUGS.has(community.slug)
  );

  const toLogo = (slug: string): MarqueeLogo | null => {
    const community = communities.find((candidate) => candidate.slug === slug);
    if (!community) return null;
    return {
      text: community.name,
      image: community.imageURL,
      href: PAGES.COMMUNITY.ALL_GRANTS(community.slug),
    };
  };

  const lead = MARQUEE_LEAD.map((entry) =>
    "communitySlug" in entry ? toLogo(entry.communitySlug) : entry
  ).filter((logo): logo is MarqueeLogo => logo !== null);

  const leadSlugs = new Set(
    MARQUEE_LEAD.flatMap((entry) => ("communitySlug" in entry ? [entry.communitySlug] : []))
  );
  const rest = communities
    .filter((community) => !leadSlugs.has(community.slug))
    .map((community) => ({
      text: community.name,
      image: community.imageURL,
      href: PAGES.COMMUNITY.ALL_GRANTS(community.slug),
    }));

  return [...lead, ...rest];
};
