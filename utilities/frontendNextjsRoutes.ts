/**
 * Routes from frontend-nextjs (karmahq.xyz) that should redirect to gov.karmahq.xyz
 *
 * IMPORTANT: gap-app-v2 routes ALWAYS take priority. If a route exists in both
 * gap-app-v2 and frontend-nextjs, DO NOT add it to this list. gap-app-v2 will
 * handle it, and the frontend-nextjs version will only be accessible at gov.karmahq.xyz
 */
export const FRONTEND_NEXTJS_ROUTES = [
  // Exact path matches
  "/actions",
  "/daos",
  "/delegation-week",
  "/find-contributor",
  "/gov",
  "/governance-tools",
  "/how-it-works",
  "/nft-badge-minting-service",
  "/endorse-governance-contributor",
  "/oldhome",
  // NOTE: /privacy-policy exists in both repos - gap-app-v2 wins, so NOT in this list
  "/dao/",
  "/case-study/",
  "/profile/",
  "/github/linking",
  "/twitter/linking",
  "/discord/linking",
  "/dynamic-nft/",
  "/app/badge-template",
] as const;
