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

const browserExtensionErrors = [
  // Browser extensions disconnecting ports (Chrome extensions, wallet extensions)
  // See https://karma-crypto-inc.sentry.io/issues/GAP-FRONTEND-1BA
  "Attempting to use a disconnected port object",
  // Wallet extensions calling chrome.runtime without proper Extension ID
  // See https://karma-crypto-inc.sentry.io/issues/GAP-FRONTEND-1B8
  "chrome.runtime.sendMessage() called from a webpage must specify an Extension ID",
];

// Expected "not found" errors when users access non-existent resources (e.g., deleted projects, old URLs)
// These are normal 404-type scenarios, not bugs worth tracking
// See https://karma-crypto-inc.sentry.io/issues/7205405990
const notFoundErrors = ["Project not found", "Community not found"];

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
  ...browserExtensionErrors,
  ...notFoundErrors,
];
