import { SITE_URL } from "@/utilities/meta";
import { WELL_KNOWN_PREFLIGHT_HEADERS } from "@/utilities/wellKnown";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Documentation-scoped llms.txt at /docs/llms.txt.
 *
 * Modular companion to the apex /llms.txt — same plain-text shape, but
 * narrowed to product documentation surfaces. Agents that want to ground
 * an answer in Karma's how-to guides can fetch this one rather than the
 * full apex file.
 *
 * Source-of-truth links here mirror the "Documentation" section of the
 * generated public/llms.txt so both stay in sync.
 */

const MARKDOWN = `# Karma — Documentation

> Product documentation, how-to guides, and partner playbooks for Karma.

The full documentation site lives at https://docs.gap.karmahq.xyz. The links below cover the most-requested topics.

## Overview
- Why Karma: https://docs.gap.karmahq.xyz
- How does it work: https://docs.gap.karmahq.xyz/overview/how-does-it-work
- Supported networks: https://docs.gap.karmahq.xyz/overview/supported-networks

## For builders
- For builders overview: https://docs.gap.karmahq.xyz/how-to-guides/for-builders
- Create project: https://docs.gap.karmahq.xyz/how-to-guides/for-builders/create-project
- Add grant to project: https://docs.gap.karmahq.xyz/how-to-guides/for-builders/add-grant-to-project
- Add milestone: https://docs.gap.karmahq.xyz/how-to-guides/for-builders/add-milestone
- Add team members: https://docs.gap.karmahq.xyz/how-to-guides/for-builders/add-team-members
- Post grant update: https://docs.gap.karmahq.xyz/how-to-guides/for-builders/post-grant-update
- Post milestone update: https://docs.gap.karmahq.xyz/how-to-guides/for-builders/post-milestone-update
- Transfer ownership: https://docs.gap.karmahq.xyz/how-to-guides/for-builders/transfer-ownership
- Merge projects: https://docs.gap.karmahq.xyz/how-to-guides/for-builders/merge-projects
- Login with Safe: https://docs.gap.karmahq.xyz/how-to-guides/for-builders/login-with-safe

## For grant managers
- For grant managers overview: https://docs.gap.karmahq.xyz/how-to-guides/for-grant-managers
- Grant review: https://docs.gap.karmahq.xyz/how-to-guides/for-grant-managers/grant-review
- Categorize grants: https://docs.gap.karmahq.xyz/how-to-guides/for-grant-managers/categorize-grants
- Verify grant update: https://docs.gap.karmahq.xyz/how-to-guides/for-grant-managers/verify-grant-update
- Impact measurement: https://docs.gap.karmahq.xyz/how-to-guides/for-grant-managers/impact-measurement

## For reviewers and community members
- For reviewers: https://docs.gap.karmahq.xyz/how-to-guides/for-reviewers
- Application review guide: https://docs.gap.karmahq.xyz/how-to-guides/for-reviewers/application-review-guide
- For community members: https://docs.gap.karmahq.xyz/how-to-guides/for-community-members
- Endorse project: https://docs.gap.karmahq.xyz/how-to-guides/for-community-members/endorse-project

## Partners
- Partners index: https://docs.gap.karmahq.xyz/how-to-guides/partners
- Filecoin: https://docs.gap.karmahq.xyz/how-to-guides/partners/filecoin
- Celo - Proof of Ship: https://docs.gap.karmahq.xyz/how-to-guides/partners/celo-proof-of-ship
- CeloPG - Proof of Impact: https://docs.gap.karmahq.xyz/how-to-guides/partners/celopg-proof-of-impact
- Gitcoin: https://docs.gap.karmahq.xyz/how-to-guides/partners/gitcoin
- Octant: https://docs.gap.karmahq.xyz/how-to-guides/partners/octant
- UNICEF: https://docs.gap.karmahq.xyz/how-to-guides/partners/unicef

## Apex pointers
- Full llms.txt: ${SITE_URL}/llms.txt
- llms-full.txt (inline content): ${SITE_URL}/llms-full.txt
- Knowledge Base: ${SITE_URL}/knowledge
`;

const PLAIN_TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
} as const;

export function GET() {
  return new Response(MARKDOWN, { status: 200, headers: PLAIN_TEXT_HEADERS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: WELL_KNOWN_PREFLIGHT_HEADERS });
}
