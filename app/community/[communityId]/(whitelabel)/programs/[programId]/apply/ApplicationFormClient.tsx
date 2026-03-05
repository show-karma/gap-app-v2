"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useStaff } from "@/src/core/rbac/hooks/use-staff-bridge";
import { AccessCodeInput } from "@/src/features/applications/components/AccessCodeInput";
import { AccessCodeModal } from "@/src/features/applications/components/AccessCodeModal";
import { ApplicationForm } from "@/src/features/applications/components/ApplicationForm";
import { useApplicationSubmit } from "@/src/features/applications/hooks/use-application-submit";
import type { ApplicationFormData } from "@/src/features/applications/types";
import type { ApplicationQuestion, IFormSchema } from "@/types/whitelabel-entities";
import fetchData from "@/utilities/fetchData";
import { PAGES } from "@/utilities/pages";
import { useWhitelabel } from "@/utilities/whitelabel-context";

const GATED_ACCESS_CODE_STORAGE_KEY_PREFIX = "gap:gated-access-code";

function getGatedAccessCodeStorageKey(communityId: string, programId: string): string {
  return `${GATED_ACCESS_CODE_STORAGE_KEY_PREFIX}:${communityId}:${programId}`;
}

interface ApplicationFormClientProps {
  communityId: string;
  programId: string;
  questions: ApplicationQuestion[];
  formSchema?: IFormSchema;
  multiStep?: boolean;
  isDisabled?: boolean;
  programName?: string;
}

export function ApplicationFormClient({
  communityId,
  programId,
  questions,
  formSchema,
  multiStep,
  isDisabled = false,
  programName,
}: ApplicationFormClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isWhitelabel, communitySlug } = useWhitelabel();

  const { submit } = useApplicationSubmit(communityId);

  // In whitelabel mode, strip /community/<slug> prefix from paths for clean URLs
  const toPath = (path: string) => {
    if (!isWhitelabel || !communitySlug) return path;
    const prefix = `/community/${communitySlug}`;
    return path.startsWith(prefix) ? path.slice(prefix.length) || "/" : path;
  };

  // Safe RBAC fallback: isStaff ?? false — PermissionProvider may not be mounted yet
  const { isStaff, isLoading: rbacLoading } = useStaff();
  const canBypassClosed = isStaff ?? false;
  const effectiveDisabled = isDisabled && !canBypassClosed;

  // Access code gating
  const isGated = Boolean(formSchema?.settings?.accessCodeEnabled);
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [unlockedAccessCode, setUnlockedAccessCode] = useState<string | null>(null);
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isValidatingUrlCode, setIsValidatingUrlCode] = useState(false);
  const urlCodeValidationAttempted = useRef(false);

  const accessCodeStorageKey = useMemo(
    () => getGatedAccessCodeStorageKey(communityId, programId),
    [communityId, programId]
  );

  const readPersistedAccessCode = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return window.sessionStorage.getItem(accessCodeStorageKey);
    } catch {
      return null;
    }
  }, [accessCodeStorageKey]);

  const persistAccessCode = useCallback(
    (code: string) => {
      if (typeof window === "undefined") return;
      try {
        window.sessionStorage.setItem(accessCodeStorageKey, code);
      } catch {
        // Ignore storage failures
      }
    },
    [accessCodeStorageKey]
  );

  const clearPersistedAccessCode = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(accessCodeStorageKey);
    } catch {
      // Ignore storage failures
    }
  }, [accessCodeStorageKey]);

  // Validate access code via API
  const validateAccessCode = useCallback(
    async (code: string): Promise<boolean> => {
      const [result, err] = await fetchData<boolean>(
        `/v2/funding-applications/${programId}/validate-access-code`,
        "POST",
        { accessCode: code }
      );
      if (err) return false;
      return Boolean(result);
    },
    [programId]
  );

  // Auto-validate URL access code or show modal on mount
  useEffect(() => {
    if (!isGated || unlockedAccessCode || urlCodeValidationAttempted.current) return;

    const persistedCode = readPersistedAccessCode();
    if (persistedCode) {
      setUnlockedAccessCode(persistedCode);
      return;
    }

    let cancelled = false;
    const urlAccessCode = searchParams.get("accessCode");

    if (urlAccessCode) {
      urlCodeValidationAttempted.current = true;
      setIsValidatingUrlCode(true);

      validateAccessCode(urlAccessCode)
        .then((isValid) => {
          if (cancelled) return;
          if (isValid) {
            setUnlockedAccessCode(urlAccessCode);
            persistAccessCode(urlAccessCode);
          } else {
            setShowAccessCodeModal(true);
          }
        })
        .catch(() => {
          if (!cancelled) setShowAccessCodeModal(true);
        })
        .finally(() => {
          if (!cancelled) setIsValidatingUrlCode(false);
        });
    } else {
      setShowAccessCodeModal(true);
    }

    return () => {
      cancelled = true;
    };
  }, [
    isGated,
    unlockedAccessCode,
    searchParams,
    validateAccessCode,
    readPersistedAccessCode,
    persistAccessCode,
  ]);

  const getApplicantEmail = (data: ApplicationFormData): string => {
    return (
      (data[questions.find((q) => q.type === "email")?.label || ""] as string) ||
      (data[
        questions.find(
          (q) => q.label.toLowerCase().includes("email") || q.label.toLowerCase().includes("e-mail")
        )?.label || ""
      ] as string) ||
      ""
    );
  };

  const handleSubmit = async (
    data: ApplicationFormData,
    aiEvaluation?: { evaluation: string; promptId: string }
  ) => {
    try {
      const applicantEmail = getApplicantEmail(data);
      const application = await submit(
        programId,
        data,
        applicantEmail,
        aiEvaluation,
        unlockedAccessCode ?? undefined
      );
      // Clear draft key on success to prevent form restoration
      try {
        window.sessionStorage.removeItem(`gap:application-form-auth:${programId}:default`);
      } catch {
        // Ignore
      }
      router.push(toPath(PAGES.COMMUNITY.APPLICATION_SUCCESS(communityId, application.id)));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit application";

      if (
        errorMessage.toLowerCase().includes("access code") ||
        errorMessage.toLowerCase().includes("incorrect")
      ) {
        setUnlockedAccessCode(null);
        clearPersistedAccessCode();
        setAccessCodeError(errorMessage);
        setShowAccessCodeModal(true);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleAccessCodeUnlock = async (code: string) => {
    if (isValidating) return;
    setIsValidating(true);
    setAccessCodeError(null);

    try {
      const isValid = await validateAccessCode(code);
      if (isValid) {
        setUnlockedAccessCode(code);
        persistAccessCode(code);
        setShowAccessCodeModal(false);
      } else {
        setAccessCodeError("Invalid access code. Please check the code and try again.");
      }
    } catch {
      setAccessCodeError("Failed to validate access code. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleCancel = () => {
    router.push(toPath(PAGES.COMMUNITY.MY_APPLICATIONS(communityId)));
  };

  if (isGated && isValidatingUrlCode) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground mt-4">Validating access code...</p>
      </div>
    );
  }

  if (isDisabled && rbacLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground mt-4">Checking permissions...</p>
      </div>
    );
  }

  if (isGated && !unlockedAccessCode) {
    return (
      <AccessCodeInput
        onSubmit={handleAccessCodeUnlock}
        isLoading={isValidating}
        error={accessCodeError}
        programName={programName}
      />
    );
  }

  return (
    <>
      {isDisabled && canBypassClosed && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary w-fit">
          <ShieldCheck className="w-3.5 h-3.5" />
          Admin override: you can submit even though applications are closed
        </div>
      )}

      <ApplicationForm
        programId={programId}
        questions={questions}
        formSchema={formSchema}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isDisabled={effectiveDisabled}
        multiStep={multiStep}
        programName={programName}
      />

      <AccessCodeModal
        isOpen={showAccessCodeModal}
        onClose={() => {
          setShowAccessCodeModal(false);
          setAccessCodeError(null);
        }}
        onSubmit={handleAccessCodeUnlock}
        isLoading={isValidating}
        error={accessCodeError}
      />
    </>
  );
}
