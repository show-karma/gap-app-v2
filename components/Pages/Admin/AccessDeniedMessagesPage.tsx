"use client";

import { Check, Loader2, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/Utilities/Button";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import { useCommunityConfig, useCommunityConfigMutation } from "@/hooks/useCommunityConfig";
import { AccessDenied } from "@/src/components/ui/AccessDenied";
import { communityAdminDenial } from "@/src/components/ui/access-denied-presets";
import type { Community } from "@/types/v2/community";
import {
  ACCESS_DENIED_DEFAULT_MESSAGES,
  ACCESS_DENIED_TEMPLATE_VARIABLES,
  type AccessDeniedScenario,
  substituteAccessDeniedTemplate,
  validateAccessDeniedTemplate,
} from "@/utilities/accessDeniedTemplate";
import { envVars } from "@/utilities/enviromentVars";

// 500-char cap mirrors backend `ACCESS_DENIED_MESSAGE_MAX_CHARS`. Keep in
// sync with gap-indexer/.../community-config.update.body.api.request.ts.
const MAX_CHARS = 500;

// Heavy editor + markdown libs — lazy-load so the rest of /manage doesn't
// pay for them on every page.
const MarkdownEditor = dynamic(
  () => import("@/components/Utilities/MarkdownEditor").then((m) => m.MarkdownEditor),
  { ssr: false }
);
const MarkdownPreview = dynamic(
  () => import("@/components/Utilities/MarkdownPreview").then((m) => m.MarkdownPreview),
  { ssr: false }
);

interface ScenarioMeta {
  scenario: AccessDeniedScenario;
  title: string;
  description: string;
  fieldKey:
    | "accessDeniedUnauthenticatedMessage"
    | "accessDeniedForbiddenMessage"
    | "accessDeniedApplicantMessage";
}

const SCENARIOS: ReadonlyArray<ScenarioMeta> = [
  {
    scenario: "unauthenticated",
    title: "When a visitor is not signed in",
    description:
      "Shown above the Sign In button when someone hits a gated page without an active session.",
    fieldKey: "accessDeniedUnauthenticatedMessage",
  },
  {
    scenario: "forbidden",
    title: "When a signed-in user lacks the right role",
    description:
      "Shown to authenticated visitors who don't have a role that satisfies the page's requirement.",
    fieldKey: "accessDeniedForbiddenMessage",
  },
  {
    scenario: "applicant",
    title: "When the denied user is an applicant",
    description:
      "Shown alongside the denial to a signed-in applicant, next to a link to view their own application.",
    fieldKey: "accessDeniedApplicantMessage",
  },
];

interface AccessDeniedMessagesPageProps {
  community: Community;
}

export function AccessDeniedMessagesPage({ community }: AccessDeniedMessagesPageProps) {
  const communitySlug = community.details?.slug || community.uid;
  const { hasAccess, isLoading: loadingAdmin } = useCommunityAdminAccess(community.uid);
  const { data: config, isLoading, error } = useCommunityConfig(communitySlug);

  if (loadingAdmin || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        {...communityAdminDenial(community.details?.name)}
        communitySlug={communitySlug}
        communityName={community.details?.name}
      />
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">
          Failed to load community configuration. Please try again.
        </p>
      </div>
    );
  }

  return (
    <AccessDeniedMessagesPageContent
      community={community}
      communitySlug={communitySlug}
      initial={{
        unauthenticated: config?.accessDeniedUnauthenticatedMessage ?? null,
        forbidden: config?.accessDeniedForbiddenMessage ?? null,
        applicant: config?.accessDeniedApplicantMessage ?? null,
      }}
    />
  );
}

interface InitialValues {
  unauthenticated: string | null;
  forbidden: string | null;
  applicant: string | null;
}

function AccessDeniedMessagesPageContent({
  community,
  communitySlug,
  initial,
}: {
  community: Community;
  communitySlug: string;
  initial: InitialValues;
}) {
  const { mutate: saveConfig, isPending: isSaving } = useCommunityConfigMutation();
  // Prefill with the Karma default copy when no override is saved so admins
  // can edit-in-place instead of starting from a blank textarea.
  const baselineUnauth = initial.unauthenticated ?? ACCESS_DENIED_DEFAULT_MESSAGES.unauthenticated;
  const baselineForbidden = initial.forbidden ?? ACCESS_DENIED_DEFAULT_MESSAGES.forbidden;
  const baselineApplicant = initial.applicant ?? ACCESS_DENIED_DEFAULT_MESSAGES.applicant;
  const [unauth, setUnauth] = useState<string>(baselineUnauth);
  const [forbidden, setForbidden] = useState<string>(baselineForbidden);
  const [applicant, setApplicant] = useState<string>(baselineApplicant);

  const unauthValidation = useMemo(
    () => validateAccessDeniedTemplate(unauth, "unauthenticated"),
    [unauth]
  );
  const forbiddenValidation = useMemo(
    () => validateAccessDeniedTemplate(forbidden, "forbidden"),
    [forbidden]
  );
  const applicantValidation = useMemo(
    () => validateAccessDeniedTemplate(applicant, "applicant"),
    [applicant]
  );

  const unauthError = formatValidationError(unauthValidation, unauth.length);
  const forbiddenError = formatValidationError(forbiddenValidation, forbidden.length);
  const applicantError = formatValidationError(applicantValidation, applicant.length);
  const hasError = Boolean(unauthError) || Boolean(forbiddenError) || Boolean(applicantError);

  const isDirty =
    unauth !== baselineUnauth || forbidden !== baselineForbidden || applicant !== baselineApplicant;

  const valueByScenario: Record<AccessDeniedScenario, string> = {
    unauthenticated: unauth,
    forbidden,
    applicant,
  };
  const setterByScenario: Record<AccessDeniedScenario, (next: string) => void> = {
    unauthenticated: setUnauth,
    forbidden: setForbidden,
    applicant: setApplicant,
  };
  const errorByScenario: Record<AccessDeniedScenario, string | null> = {
    unauthenticated: unauthError,
    forbidden: forbiddenError,
    applicant: applicantError,
  };

  const handleSave = () => {
    if (hasError) return;
    // Treat empty OR unchanged-from-default as "no override" so we don't
    // freeze the current default copy into the DB the moment an admin opens
    // the page and hits Save.
    const normalize = (value: string, scenario: AccessDeniedScenario): string | null => {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (trimmed === ACCESS_DENIED_DEFAULT_MESSAGES[scenario].trim()) return null;
      return value;
    };
    saveConfig(
      {
        slug: communitySlug,
        config: {
          accessDeniedUnauthenticatedMessage: normalize(unauth, "unauthenticated"),
          accessDeniedForbiddenMessage: normalize(forbidden, "forbidden"),
          accessDeniedApplicantMessage: normalize(applicant, "applicant"),
        },
      },
      {
        onSuccess: () => toast.success("Access Denied messages saved"),
        onError: (err) => toast.error(err.message || "Failed to save"),
      }
    );
  };

  const handleReset = () => {
    setUnauth(baselineUnauth);
    setForbidden(baselineForbidden);
    setApplicant(baselineApplicant);
  };

  return (
    <div className="space-y-6">
      <div className="pb-2">
        <h1 className="text-xl font-bold text-stone-900 dark:text-zinc-100">Access Denied Page</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
          Customize the Markdown shown on the Access Denied page for{" "}
          {community.details?.name || "this community"}. Leave a field empty to fall back to the
          default Karma copy.
        </p>
      </div>

      <TokenReferencePanel />

      {SCENARIOS.map((meta) => (
        <MessageEditorSection
          key={meta.scenario}
          meta={meta}
          communityName={community.details?.name ?? ""}
          communitySlug={communitySlug}
          value={valueByScenario[meta.scenario]}
          onChange={setterByScenario[meta.scenario]}
          errorMessage={errorByScenario[meta.scenario]}
        />
      ))}

      <div className="mt-6 flex justify-end gap-2">
        {isDirty && !isSaving ? (
          <Button type="button" variant="secondary" onClick={handleReset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Discard
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving || hasError}
          aria-disabled={!isDirty || isSaving || hasError}
          aria-label="Save Access Denied messages"
        >
          {isSaving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}

function formatValidationError(
  result: { unknownTokens: readonly string[]; disallowedTokens: readonly string[] },
  length: number
): string | null {
  if (length > MAX_CHARS) {
    return `Message exceeds the ${MAX_CHARS}-character limit (${length}).`;
  }
  if (result.unknownTokens.length > 0) {
    const list = result.unknownTokens.map((t) => `{{${t}}}`).join(", ");
    return `Unknown template token(s): ${list}.`;
  }
  if (result.disallowedTokens.length > 0) {
    const list = result.disallowedTokens.map((t) => `{{${t}}}`).join(", ");
    return `Token(s) not allowed in this scenario: ${list}.`;
  }
  return null;
}

function MessageEditorSection({
  meta,
  communityName,
  communitySlug,
  value,
  onChange,
  errorMessage,
}: {
  meta: ScenarioMeta;
  communityName: string;
  communitySlug: string;
  value: string;
  onChange: (next: string) => void;
  errorMessage: string | null;
}) {
  const previewSource = useMemo(() => {
    if (!value.trim()) return "";
    return substituteAccessDeniedTemplate(value, {
      communityName: communityName || "Your Community",
      communitySlug,
      appUrl: envVars.VERCEL_URL || "https://gap.karmahq.xyz",
      requiredRoles: "Community Admin",
      currentRoles: meta.scenario === "forbidden" ? "Reviewer" : null,
    });
  }, [value, communityName, communitySlug, meta.scenario]);

  return (
    <section
      aria-labelledby={`section-${meta.scenario}`}
      className="space-y-3 rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div>
        <h2
          id={`section-${meta.scenario}`}
          className="text-sm font-semibold text-stone-900 dark:text-zinc-100"
        >
          {meta.title}
        </h2>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">{meta.description}</p>
      </div>

      <MarkdownEditor
        id={`access-denied-${meta.scenario}`}
        value={value}
        onChange={onChange}
        maxLength={MAX_CHARS}
        showCharacterCount
        enablePreviewToggle={false}
        height={220}
        placeholder="Enter Markdown. Leave empty to use Karma's default message."
        error={errorMessage ?? undefined}
        aria-describedby={`hint-${meta.scenario}`}
      />

      <p id={`hint-${meta.scenario}`} className="text-xs text-stone-500 dark:text-zinc-400">
        Allowed tokens:{" "}
        {ACCESS_DENIED_TEMPLATE_VARIABLES[meta.scenario].map((t) => (
          <code
            key={t}
            className="mx-0.5 rounded border border-stone-200 bg-stone-50 px-1 py-0.5 text-[11px] text-stone-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >{`{{${t}}}`}</code>
        ))}
      </p>

      {previewSource ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-stone-600 dark:text-zinc-400">Preview</p>
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
            <MarkdownPreview source={previewSource} variant="inline" />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TokenReferencePanel() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed dark:border-blue-900/40 dark:bg-blue-950/30">
      <p className="font-semibold text-blue-900 dark:text-blue-200">Template tokens</p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-blue-900/90 dark:text-blue-100/90">
        <li>
          <code>{`{{communityName}}`}</code> — the community's display name
        </li>
        <li>
          <code>{`{{communitySlug}}`}</code> — the URL slug for the community
        </li>
        <li>
          <code>{`{{appUrl}}`}</code> — the Karma app base URL
        </li>
        <li>
          <code>{`{{requiredRoles}}`}</code> — the role(s) the page requires
        </li>
        <li>
          <code>{`{{currentRoles}}`}</code> — the visitor's current roles (forbidden message only)
        </li>
      </ul>
    </div>
  );
}
