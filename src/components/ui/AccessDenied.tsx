"use client";

import { AlertTriangle, LogIn } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAccessDeniedMessages } from "@/hooks/useAccessDeniedMessages";
import { useAuth } from "@/hooks/useAuth";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { isValidRole, ROLE_LABELS, Role } from "@/src/core/rbac/types";
import {
  ACCESS_DENIED_DEFAULT_MESSAGES,
  substituteAccessDeniedTemplate,
} from "@/utilities/accessDeniedTemplate";
import { envVars } from "@/utilities/enviromentVars";

const MarkdownPreview = dynamic(
  () => import("@/components/Utilities/MarkdownPreview").then((m) => m.MarkdownPreview),
  { ssr: false }
);

interface AccessDeniedCta {
  label: string;
  href: string;
}

interface AccessDeniedProps {
  title?: string;
  message?: string;
  returnUrl?: string;
  requiredRoles?: ReadonlyArray<Role | string>;
  currentRolesOverride?: ReadonlyArray<Role>;
  isLoading?: boolean;
  cta?: AccessDeniedCta;
  /**
   * When provided, fetch the per-community Markdown overrides for the
   * AccessDenied body (public endpoint) and render the matching
   * scenario string instead of the hard-coded copy. Null/empty
   * messages fall back to the existing default so existing callers
   * keep working without changes.
   */
  communitySlug?: string;
  communityName?: string;
}

function formatList(items: ReadonlyArray<string>): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
}

function labelFor(role: Role | string): string {
  if (typeof role === "string" && isValidRole(role)) {
    return ROLE_LABELS[role];
  }
  if (typeof role === "string") {
    return role;
  }
  return ROLE_LABELS[role];
}

function DenialSkeleton() {
  return (
    <div className="w-full mx-auto py-16 flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="max-w-lg w-full">
        <CardContent className="py-12 px-8">
          <div className="animate-pulse space-y-4">
            <div className="mx-auto h-20 w-20 rounded-full bg-gray-200 dark:bg-zinc-700" />
            <div className="mx-auto h-6 w-1/2 rounded bg-gray-200 dark:bg-zinc-700" />
            <div className="mx-auto h-4 w-3/4 rounded bg-gray-200 dark:bg-zinc-700" />
            <div className="mx-auto h-10 w-32 rounded bg-gray-200 dark:bg-zinc-700" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DenialBodyProps {
  authenticated: boolean;
  message?: string;
  customMessage?: string | null;
  communityName?: string;
}

// Fallback noun when no community context is available. Kept here
// (not at the call site) so every default branch reads the same.
const COMMUNITY_FALLBACK = "community";

function CustomMarkdownBody({ source }: { source: string }) {
  return (
    <div className="text-muted-foreground mb-8 text-left" data-testid="access-denied-custom">
      <MarkdownPreview source={source} variant="inline" />
    </div>
  );
}

function DenialBody({ authenticated, message, customMessage, communityName }: DenialBodyProps) {
  if (customMessage) {
    return <CustomMarkdownBody source={customMessage} />;
  }
  if (message) {
    return <p className="text-muted-foreground mb-8">{message}</p>;
  }
  const communityLabel = communityName ?? COMMUNITY_FALLBACK;
  const fallback = authenticated
    ? substituteAccessDeniedTemplate(ACCESS_DENIED_DEFAULT_MESSAGES.forbidden, {
        communityName: communityLabel,
        communitySlug: "",
        appUrl: "",
        requiredRoles: "",
        currentRoles: "",
      })
    : ACCESS_DENIED_DEFAULT_MESSAGES.unauthenticated;
  return <CustomMarkdownBody source={fallback} />;
}

export function AccessDenied({
  title,
  message,
  returnUrl = "/",
  requiredRoles,
  currentRolesOverride,
  isLoading,
  cta,
  communitySlug,
  communityName,
}: AccessDeniedProps) {
  const { authenticated, login } = useAuth();
  const router = useRouter();
  const { roles: detectedRoles, isLoading: isRbacLoading } = usePermissionContext();
  const { data: customMessages, isLoading: isCustomLoading } = useAccessDeniedMessages(
    communitySlug,
    !!communitySlug
  );

  const requiredList =
    requiredRoles && requiredRoles.length > 0 ? formatList(requiredRoles.map(labelFor)) : null;

  const customMessage = useMemo(() => {
    if (!communitySlug || !customMessages) return null;
    const raw = authenticated
      ? customMessages.forbiddenMessage
      : customMessages.unauthenticatedMessage;
    if (!raw) return null;
    const visibleRoles =
      currentRolesOverride ??
      detectedRoles.roles.filter((r) => r !== Role.GUEST && r !== Role.NONE);
    return substituteAccessDeniedTemplate(raw, {
      communityName: communityName ?? "",
      communitySlug,
      appUrl: envVars.VERCEL_URL,
      requiredRoles: requiredList ?? "",
      currentRoles: authenticated
        ? visibleRoles.length > 0
          ? formatList(visibleRoles.map((r) => ROLE_LABELS[r]))
          : ROLE_LABELS[Role.NONE]
        : null,
    });
  }, [
    communitySlug,
    communityName,
    customMessages,
    authenticated,
    currentRolesOverride,
    detectedRoles.roles,
    requiredList,
  ]);

  if (isLoading || isRbacLoading || (communitySlug && isCustomLoading)) {
    return <DenialSkeleton />;
  }

  const handleClick = () => {
    if (!authenticated) {
      login();
      return;
    }
    if (cta) {
      router.push(cta.href);
      return;
    }
    router.push(returnUrl);
  };

  // `cta` is a post-login redirect target — only honor it once the visitor is
  // signed in. Unauthenticated users always see the Sign In button.
  const buttonLabel = authenticated ? (cta?.label ?? "Go to Home") : "Sign In";
  // The title is part of the Markdown body (bold first line), so we only
  // render a separate h1 when a caller explicitly passes `title` — e.g.
  // page-specific headings like "Faucet admin access required".
  const resolvedTitle = title ?? null;

  return (
    <div className="w-full mx-auto py-16 flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="max-w-lg">
        <CardContent className="text-center py-12 px-8">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {resolvedTitle ? <h1 className="text-2xl font-bold mb-4">{resolvedTitle}</h1> : null}
          <DenialBody
            authenticated={authenticated}
            message={message}
            customMessage={customMessage}
            communityName={communityName}
          />

          <Button type="button" onClick={handleClick}>
            <LogIn className="w-4 h-4 mr-2" />
            {buttonLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
