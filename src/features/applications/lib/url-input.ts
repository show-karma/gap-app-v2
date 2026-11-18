export const INVALID_URL_MESSAGE = "Enter the full link, starting with https://";

export function isValidWebUrl(value: string): boolean {
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const labels = url.hostname.split(".");
    return labels.length > 1 && labels.every((label) => label.length > 0);
  } catch {
    return false;
  }
}
