/**
 * Mustache-style `{{var}}` substitution for per-community AccessDenied
 * messages. Closed vocabulary; the backend validator
 * (`validateAccessDeniedTemplate`) rejects unknown tokens at write
 * time so we only need to substitute what's known. Unknown tokens at
 * render time are left literal — never silently deleted — so a
 * downgraded backend (validator removed) still shows the admin
 * exactly what they typed instead of an invisible gap.
 *
 * Scenario contract — `{{currentRoles}}` is only meaningful when the
 * visitor is signed in (forbidden scenario). Callers MUST pass
 * `currentRoles: null` when rendering the unauthenticated message;
 * the substitution then leaves `{{currentRoles}}` literal, matching
 * the backend validator behavior for that scenario.
 */
interface AccessDeniedTemplateVars {
  communityName: string;
  communitySlug: string;
  appUrl: string;
  requiredRoles: string;
  currentRoles: string | null;
}

const TOKEN_RE = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

export type AccessDeniedScenario = "unauthenticated" | "forbidden" | "applicant";

/**
 * Closed vocabulary per scenario. Mirrors
 * `gap-indexer/app/modules/v2/domain/services/access-denied-template.domain.service.ts`
 * so admins get the same inline errors the backend would emit on save.
 * Keep both lists in sync when adding tokens on either side.
 */
export const ACCESS_DENIED_TEMPLATE_VARIABLES = {
  unauthenticated: ["communityName", "communitySlug", "appUrl", "requiredRoles"],
  forbidden: ["communityName", "communitySlug", "appUrl", "requiredRoles", "currentRoles"],
  applicant: ["communityName"],
} as const satisfies Record<AccessDeniedScenario, readonly string[]>;

/**
 * Default Markdown rendered by `<AccessDenied />` when a community has no
 * override saved. Exported so the admin editor can prefill the fields with
 * the same copy admins see in production — letting them tweak the default
 * instead of staring at an empty textarea.
 *
 * Keep these strings in sync with the fallback branches in
 * `src/components/ui/AccessDenied.tsx`.
 */
export const ACCESS_DENIED_DEFAULT_MESSAGES: Record<AccessDeniedScenario, string> = {
  unauthenticated:
    "**Sign in to continue**\n\nThis area is reserved for folks with the right access. Pop in and we'll take it from there.",
  forbidden:
    "**You're almost there**\n\nYou're signed in, but this page needs a role your account doesn't have yet. Reach out to a {{communityName}} admin and they can get you set up.",
  applicant:
    "**Looking for your application?**\n\nYou applied to {{communityName}} — view your application and track its status from your own page.",
};

interface AccessDeniedTemplateValidationResult {
  readonly unknownTokens: readonly string[];
  readonly disallowedTokens: readonly string[];
}

const EMPTY_VALIDATION: AccessDeniedTemplateValidationResult = Object.freeze({
  unknownTokens: Object.freeze([]),
  disallowedTokens: Object.freeze([]),
});

export function validateAccessDeniedTemplate(
  template: string | null | undefined,
  scenario: AccessDeniedScenario
): AccessDeniedTemplateValidationResult {
  if (!template) return EMPTY_VALIDATION;

  const allowed = new Set<string>(ACCESS_DENIED_TEMPLATE_VARIABLES[scenario]);
  const allKnown = new Set<string>([
    ...ACCESS_DENIED_TEMPLATE_VARIABLES.unauthenticated,
    ...ACCESS_DENIED_TEMPLATE_VARIABLES.forbidden,
  ]);

  const unknown = new Set<string>();
  const disallowed = new Set<string>();

  for (const match of template.matchAll(TOKEN_RE)) {
    const name = match[1];
    if (!allKnown.has(name)) {
      unknown.add(name);
      continue;
    }
    if (!allowed.has(name)) {
      disallowed.add(name);
    }
  }

  return {
    unknownTokens: Array.from(unknown),
    disallowedTokens: Array.from(disallowed),
  };
}

export function substituteAccessDeniedTemplate(
  template: string,
  vars: AccessDeniedTemplateVars
): string {
  return template.replace(TOKEN_RE, (match, name: string) => {
    switch (name) {
      case "communityName":
        return vars.communityName;
      case "communitySlug":
        return vars.communitySlug;
      case "appUrl":
        return vars.appUrl;
      case "requiredRoles":
        return vars.requiredRoles;
      case "currentRoles":
        return vars.currentRoles ?? match;
      default:
        return match;
    }
  });
}
