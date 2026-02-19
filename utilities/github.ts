export type GithubValidationResult = { valid: true } | { valid: false; error: string };

/**
 * Validates a GitHub URL, accepting only github.com/{username} or github.com/{organization} format.
 * Rejects repo URLs (github.com/owner/repo) and org page URLs (github.com/orgs/X/...).
 * Verifies the user/org exists via the GitHub API.
 */
export async function validateGithubInput(
  value: string,
  fetchFn: typeof fetch = fetch
): Promise<GithubValidationResult> {
  if (!value || value.trim().length === 0) {
    return { valid: true };
  }

  let githubUrl: URL;
  if (value.includes("github.com")) {
    const withProtocol = value.includes("http") ? value : `https://${value}`;
    try {
      githubUrl = new URL(withProtocol);
    } catch {
      return {
        valid: false,
        error: "Please use the format https://github.com/your-organization",
      };
    }
  } else {
    return {
      valid: false,
      error: "Please use the format https://github.com/your-organization",
    };
  }

  const pathParts = githubUrl.pathname.split("/").filter(Boolean);

  if (pathParts.length === 0) {
    return {
      valid: false,
      error: "Please use the format https://github.com/your-organization",
    };
  }

  // Reject github.com/orgs/X/... → guide to github.com/X
  if (pathParts[0] === "orgs" && pathParts.length >= 2) {
    return {
      valid: false,
      error: `Please use https://github.com/${pathParts[1]} instead.`,
    };
  }

  // Reject repo URLs like github.com/owner/repo → guide to github.com/owner
  if (pathParts.length >= 2) {
    return {
      valid: false,
      error: `Please use https://github.com/${pathParts[0]} instead.`,
    };
  }

  // Valid format: single segment — github.com/username or github.com/org
  const name = pathParts[0];
  const response = await fetchFn(`https://api.github.com/users/${name}`);
  if (!response.ok) {
    return {
      valid: false,
      error: `GitHub user or organization "${name}" not found.`,
    };
  }

  return { valid: true };
}
