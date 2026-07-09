# Sanity (free tier) as the headless CMS for the on-site Blog

The Karma blog moves from external Paragraph (`paragraph.xyz/@karmahq`) onto `karmahq.xyz/blog` so search authority accrues to our domain instead of Paragraph's, and so non-devs can publish without a code PR. We chose Sanity's free tier as the headless CMS: gap-app-v2 keeps a thin server-rendered `/blog` route that fetches published content, while content storage, editor auth (Sanity project membership), and media hosting live in Sanity's cloud. Sanity Studio is embedded at `/admin/studio` in gap-app-v2 (deliberate: schema changes and their renderers ship in the same PR; access is gated by Sanity login, and the route is noindexed). Hard constraint at decision time: $0 budget.

## Considered Options

- **Payload 3 self-hosted** — also $0 (MIT), would reuse our existing MongoDB and mount at `/admin` inside gap-app-v2. Rejected because it embeds a CMS admin panel, editor account management, schema migrations, and uptime responsibility into the product app to save a vendor dependency; ops attention is our scarce resource. The 2026 Figma acquisition also killed Payload Cloud, making self-hosting the only mode.
- **Keep authoring on Paragraph, mirror on-site via API/RSS** — rejected: Paragraph is not designed as a headless source; canonical control is murky (posts also publish to Arweave/Paragraph's domain), recreating the duplicate-content ambiguity we fought in the 2026 GSC indexing work.
- **MDX in repo / git-based editors (Keystatic, Decap)** — rejected: every publish requires a commit + deploy and only dev-adjacent authors can use it, defeating the editorial-independence driver.
- **Contentful/Hygraph/DatoCMS free tiers** — tighter limits and steep pricing cliffs.

## Consequences

- Vendor risk: the free tier (≈10k documents, ~500k–1M CDN API req/mo, ~20 seats as of mid-2026) could shrink. Exit is cheap — content exports as JSON and the rendering layer is CMS-agnostic by design.
- Free tier has no scheduled publishing and no custom roles.
- The existing `/knowledge` hub deliberately stays code-authored TSX (see CONTEXT.md "Content surfaces") — this ADR covers Blog posts only.
