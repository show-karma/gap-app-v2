/**
 * Next.js framework phases that wrap every server render. Their children
 * (layout/page server components, generateMetadata, fetches) are re-parented
 * by the SDK, so dropping them keeps the trace readable at a fraction of the
 * span quota.
 */
export const sentryIgnoredSpans: RegExp[] = [
  /^resolve page components$/,
  /^start response$/,
  /^prepare route module$/,
  /^load route module$/,
  /^build component tree$/,
  /^NextNodeServer\.clientComponentLoading$/,
];
