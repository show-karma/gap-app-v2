// Colocated on purpose. `app/t/[tenant]/not-found.tsx` sits next to the root
// layout, and measured against a production build it does NOT catch a
// `notFound()` thrown by a page one level below it — that request falls through
// to Next's built-in 404, which carries none of our chrome. A boundary inside
// this segment is caught, so the blocked-prefix response renders the real page.
// It re-exports rather than duplicates, so the two 404s can never drift.
export { default } from "../not-found";
