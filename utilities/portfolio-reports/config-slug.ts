/**
 * Mirrors the indexer's config slug derivation (`config-slug.util.ts`) so the
 * admin list can build the same public report URL the API publishes.
 */
const SLUG_FALLBACK = "report";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/([-]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, "")
    .replace(/[:;=][()DP]/g, "")
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/-{2,}/g, "-")
    .trim()
    .replace(/^-+|-+$/g, "");
}

export function buildConfigSlug(name: string): string {
  return slugify(name) || SLUG_FALLBACK;
}

function resolveUniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base.toLowerCase())) return base;
  for (let suffix = 2; suffix <= taken.size + 2; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return base;
}

interface SluggableConfig {
  id?: string;
  name: string;
  createdAt: string;
}

/** Config id → slug, assigned in creation order so collisions get `-2`, `-3`… like the API. */
export function deriveConfigSlugs(configs: SluggableConfig[]): Map<string, string> {
  const ordered = [...configs].sort((a, b) => {
    const byDate = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return byDate !== 0 ? byDate : (a.id ?? "").localeCompare(b.id ?? "");
  });
  const slugs = new Map<string, string>();
  const taken = new Set<string>();
  for (const config of ordered) {
    if (!config.id) continue;
    const slug = resolveUniqueSlug(buildConfigSlug(config.name), taken);
    slugs.set(config.id, slug);
    taken.add(slug.toLowerCase());
  }
  return slugs;
}
