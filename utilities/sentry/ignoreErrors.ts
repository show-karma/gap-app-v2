const unsupportedWalletErrors = [
  "Backpack couldn't override `window.ethereum`.",
  "Talisman extension has not been configured yet",
];

const walletConnectErrors = [
  "No matching key. session topic doesn't exist",
  // See https://github.com/hemilabs/ui-monorepo/issues/1081
  "this.provider.disconnect is not a function",
  "n.disconnect is not a function",
  "indexedDB is not defined",
  // WalletConnect WebSocket origin rejection - not caused by our code
  // See https://karma-crypto-inc.sentry.io/issues/KARMA-GAP-WHITELABEL-28
  "WebSocket connection closed abnormally with code: 3000",
];

const walletProviderErrors = [
  // MetaMask's injected provider throws this when the extension aborts or
  // rejects the connection handshake (popup dismissed, extension locked,
  // another wallet extension competing for window.ethereum). Privy's login
  // modal surfaces a user-facing error for this failure mode, so suppressing
  // it in Sentry keeps the issue feed actionable.
  // See https://karma-crypto-inc.sentry.io/issues/7453497949/
  "Failed to connect to MetaMask",
];

// wagmi throws `ConnectorNotConnectedError: Connector not connected.` when a
// wallet client is requested before the connector finishes connecting. This is
// the documented Privy↔wagmi startup race (Privy reports authenticated while
// wagmi is still reconnecting). `safeGetWalletClient` now guards/reconnects and
// no longer routes this through `errorManager`; this entry is defense-in-depth
// for any other code path that surfaces it.
// See https://karma-crypto-inc.sentry.io/issues/GAP-FRONTEND-244
const connectorStartupRaceErrors = ["Connector not connected", "ConnectorNotConnectedError"];

const browserExtensionErrors = [
  // Browser extensions disconnecting ports (Chrome extensions, wallet extensions)
  // See https://karma-crypto-inc.sentry.io/issues/GAP-FRONTEND-1BA
  "Attempting to use a disconnected port object",
  // Wallet extensions calling chrome.runtime without proper Extension ID
  // See https://karma-crypto-inc.sentry.io/issues/GAP-FRONTEND-1B8
  "chrome.runtime.sendMessage() called from a webpage must specify an Extension ID",
];

// Next.js throws `Error: Connection closed.` when a streaming SSR/RSC response
// is aborted — most commonly because the user navigated away before the
// stream finished, or a route prefetch was cancelled mid-flight. The error is
// internal to Next's React server-renderer and there's no user-visible
// failure (the client either renders the new route or retries the fetch).
// Surfaced on `/project/:projectId/funding` because the profile page
// prefetches grants/updates/impacts in parallel, multiplying the abort
// surface area.
// See https://karma-crypto-inc.sentry.io/issues/7104802234/ (DEV-257)
const streamingAbortErrors = [/^Error: Connection closed\.?$/i, "Connection closed."];

const sentryInstrumentationErrors = [
  // Sentry's own lazy-loaded Replay integration occasionally fails to fetch
  // (chunk eviction after a deploy, network blip, ad-blocker, CSP). Replay is
  // optional telemetry, so we filter the failure instead of surfacing it as a
  // top-volume Sentry issue. The catch in `instrumentation-client.ts` handles
  // the unhandled rejection; this entry is defense-in-depth in case the error
  // reaches Sentry through a different code path.
  // See https://karma-crypto-inc.sentry.io/issues/7403099774/
  "Error when loading integration: replayIntegration",
];

// Expected "not found" errors when users access non-existent resources (e.g., deleted projects, old URLs)
// These are normal 404-type scenarios, not bugs worth tracking
// See https://karma-crypto-inc.sentry.io/issues/7205405990
const notFoundErrors = ["Project not found", "Community not found"];

// NOTE on stale-deploy chunk failures (ChunkLoadError): these are intentionally
// NOT added to this list. Sentry's `ignoreErrors` filters every event — including
// the manual `Sentry.captureException` the error boundaries call on a
// non-recoverable second attempt — so suppressing the signature here would also
// drop the genuinely-broken cases we want to see. Recovery is gated entirely by
// the boundaries: the first attempt hard-reloads without capturing and the
// second (recovery exhausted) reports normally. See utilities/isChunkLoadError.ts.

// Anonymous-traffic errors. When a logged-out user lands on a public page
// (e.g. /project/:projectId), some indexer routes (or SDK callers) still
// hit auth-required paths without a bearer token and the backend replies
// with this 401 payload. Filter it out — the request itself isn't broken,
// it just happened on a path that doesn't support anonymous access. See
// DEV-256.
const anonymousAuthErrors = ["Authorization header is required"];

// React 19 streaming/Suspense-resume reconciliation crash. React DOM's stream
// runtime ($RS) reads `parentNode`/`removeChild` on a node it owns and finds
// it `null` because an EXTERNAL DOM mutator removed it between commits — almost
// always Google Translate / in-browser translate rewriting text nodes, or an
// aggressive browser extension, on top of streamed SSR content. It is thrown
// from the injected $RS <script> at global scope (`mechanism: onerror`), outside
// React's render/commit phases, so an error boundary cannot catch it. We attack
// the dominant trigger at the source by marking the affected subtrees
// `translate="no"` so machine translation leaves React-owned nodes alone; the
// residual (other external mutators) is environmental and not actionable, so we
// filter it here. Sibling to the existing "node to be removed is not a child of
// this node." entry below.
// See https://karma-crypto-inc.sentry.io/issues/GAP-FRONTEND-212
const reconciliationDomMutationErrors = [
  /Cannot read properties of null \(reading '(parentNode|removeChild)'\)/,
  /null is not an object \(evaluating '.*\.(parentNode|removeChild)/,
];

export const sentryIgnoreErrors = [
  // user rejected a confirmation in the wallet
  "rejected the request",
  // React internal error thrown when something outside react modifies the DOM
  // This is usually because of a browser extension or Chrome's built-in translate. There's no action to do.
  // See https://blog.sentry.io/making-your-javascript-projects-less-noisy/#ignore-un-actionable-errors
  "The node to be removed is not a child of this node.",
  "The node before which the new node is to be inserted is not a child of this node.",
  // Thrown when firefox prevents an add-on from referencing a DOM element that has been removed.
  `TypeError: can't access dead object`,
  ...unsupportedWalletErrors,
  ...walletConnectErrors,
  ...walletProviderErrors,
  ...connectorStartupRaceErrors,
  ...browserExtensionErrors,
  ...sentryInstrumentationErrors,
  ...notFoundErrors,
  ...streamingAbortErrors,
  ...anonymousAuthErrors,
  ...reconciliationDomMutationErrors,
];
