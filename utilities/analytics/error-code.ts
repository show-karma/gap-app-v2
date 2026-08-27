/**
 * Reduces a thrown value to the stable machine code that `FailureProps.error_code`
 * expects.
 *
 * Never the message. Messages carry interpolated ids, wallet addresses and
 * backend prose that changes between releases, which makes them both a PII risk
 * and useless as a grouping key — a `_failed` funnel split across forty
 * variations of the same failure tells you nothing.
 */

interface HttpErrorLike {
  response?: { status?: number };
  status?: number;
  code?: string;
  name?: string;
}

const asObject = (error: unknown): HttpErrorLike | null =>
  typeof error === "object" && error !== null ? (error as HttpErrorLike) : null;

export const toErrorCode = (error: unknown): string => {
  const candidate = asObject(error);
  if (!candidate) return "unknown";

  // An HTTP status is the most specific stable code available, so it wins over
  // the generic `AxiosError` name every axios rejection would otherwise report.
  const status = candidate.response?.status ?? candidate.status;
  if (typeof status === "number") return `http_${status}`;

  if (typeof candidate.code === "string" && candidate.code) return candidate.code;
  if (typeof candidate.name === "string" && candidate.name) return candidate.name;
  return "unknown";
};
