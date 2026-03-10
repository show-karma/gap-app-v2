/**
 * Sanitizes and minifies wallet/transaction error messages for user-friendly display.
 */

interface SanitizedError {
  title: string;
  message: string;
}

const ERROR_PATTERNS: Array<{
  patterns: string[];
  title: string;
  message: string;
}> = [
  {
    patterns: ["rejected", "denied", "user rejected", "user denied"],
    title: "Transaction Rejected",
    message: "You rejected the transaction request.",
  },
  {
    patterns: ["insufficient funds", "insufficient balance"],
    title: "Insufficient Funds",
    message: "Your wallet doesn't have enough funds for this transaction.",
  },
  {
    patterns: ["already pending", "pending request"],
    title: "Request Pending",
    message: "A wallet request is already pending. Check your wallet.",
  },
  {
    patterns: [
      "wrong network",
      "wrong chain",
      "network mismatch",
      "chain mismatch",
      "chain id",
      "switch network",
      "switch chain",
      "wallet_switchethereumchain",
    ],
    title: "Network Error",
    message: "Please switch to the correct network in your wallet.",
  },
  {
    patterns: ["reverted", "execution reverted"],
    title: "Transaction Failed",
    message: "The transaction was reverted. Please try again.",
  },
  {
    patterns: ["timeout", "timed out"],
    title: "Request Timeout",
    message: "The request timed out. Please try again.",
  },
  {
    patterns: ["disconnected", "not connected"],
    title: "Wallet Disconnected",
    message: "Your wallet was disconnected. Please reconnect.",
  },
  {
    patterns: ["nonce", "replacement"],
    title: "Transaction Conflict",
    message: "Transaction conflict detected. Please try again.",
  },
];

const MAX_MESSAGE_LENGTH = 100;

/**
 * Sanitizes an error message for display in a toast notification.
 */
export function sanitizeErrorMessage(error: unknown, defaultTitle = "Error"): SanitizedError {
  const rawMessage = error instanceof Error ? error.message : String(error || "Unknown error");

  const lowerMessage = rawMessage.toLowerCase();

  for (const { patterns, title, message } of ERROR_PATTERNS) {
    if (patterns.some((pattern) => lowerMessage.includes(pattern))) {
      return { title, message };
    }
  }

  let message = rawMessage;

  const prefixesToRemove = [
    "TransactionExecutionError:",
    "ContractFunctionExecutionError:",
    "UserRejectedRequestError:",
    "Error:",
  ];

  for (const prefix of prefixesToRemove) {
    if (message.toLowerCase().startsWith(prefix.toLowerCase())) {
      message = message.slice(prefix.length).trim();
    }
  }

  const firstSentence = message.split(/[.!]\s/)[0];
  if (firstSentence && firstSentence.length < MAX_MESSAGE_LENGTH) {
    message = firstSentence;
  } else if (message.length > MAX_MESSAGE_LENGTH) {
    message = `${message.slice(0, MAX_MESSAGE_LENGTH - 3)}...`;
  }

  if (!message || message === "[object Object]") {
    message = "Something went wrong. Please try again.";
  }

  return { title: defaultTitle, message };
}
