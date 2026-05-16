"use client";

import { AlertTriangle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { isValidRole, ROLE_LABELS, Role } from "@/src/core/rbac/types";

interface AccessDeniedCta {
  label: string;
  href: string;
}

interface AccessDeniedProps {
  title?: string;
  message?: string;
  returnUrl?: string;
  requiredRoles?: ReadonlyArray<Role | string>;
  contactLabel?: string;
  currentRolesOverride?: ReadonlyArray<Role>;
  isLoading?: boolean;
  cta?: AccessDeniedCta;
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

export function AccessDenied({
  title = "Access Denied",
  message,
  returnUrl = "/",
  requiredRoles,
  contactLabel,
  currentRolesOverride,
  isLoading,
  cta,
}: AccessDeniedProps) {
  const { authenticated, login } = useAuth();
  const router = useRouter();
  const { roles: detectedRoles, isLoading: isRbacLoading } = usePermissionContext();

  if (isLoading || isRbacLoading) {
    return <DenialSkeleton />;
  }

  const requiredList =
    requiredRoles && requiredRoles.length > 0 ? formatList(requiredRoles.map(labelFor)) : null;

  let body: React.ReactNode;
  if (requiredList) {
    if (!authenticated) {
      body = (
        <p className="text-muted-foreground mb-8">
          You need to sign in to view this page. This page requires {requiredList}{" "}
          {requiredRoles && requiredRoles.length === 1 ? "role" : "roles"}.
        </p>
      );
    } else {
      const currentRoles =
        currentRolesOverride ??
        detectedRoles.roles.filter((r) => r !== Role.GUEST && r !== Role.NONE);
      const currentList =
        currentRoles.length > 0
          ? formatList(currentRoles.map((r) => ROLE_LABELS[r]))
          : ROLE_LABELS[Role.NONE];
      body = (
        <p className="text-muted-foreground mb-8">
          You don&apos;t have access to this page. You need {requiredList}{" "}
          {requiredRoles && requiredRoles.length === 1 ? "role" : "roles"}. Your account has:{" "}
          {currentList}.{contactLabel ? ` Please contact ${contactLabel}.` : ""}
        </p>
      );
    }
  } else {
    body = (
      <p className="text-muted-foreground mb-8">
        {message ?? "You don't have permission to view this page."}
      </p>
    );
  }

  const handleClick = () => {
    if (cta) {
      router.push(cta.href);
      return;
    }
    if (!authenticated) {
      login();
      return;
    }
    router.push(returnUrl);
  };

  const buttonLabel = cta?.label ?? (authenticated ? "Go to Home" : "Sign In");

  return (
    <div className="w-full mx-auto py-16 flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="max-w-lg">
        <CardContent className="text-center py-12 px-8">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4">{title}</h1>
          {body}

          <Button type="button" onClick={handleClick}>
            <LogIn className="w-4 h-4 mr-2" />
            {buttonLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
