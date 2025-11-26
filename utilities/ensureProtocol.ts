export const ensureProtocol = (url?: string) => {
  if (!url) return url;

  // If URL already has a protocol, return as-is
  if (url.match(/^https?:\/\//)) {
    return url;
  }

  // If URL starts with www. or looks like a domain, add https://
  if (url.match(/^(www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/)) {
    return `https://${url}`;
  }

  // For other cases (like relative paths), return as-is
  return url;
};
