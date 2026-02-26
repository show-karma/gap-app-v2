"use client";

import { AlertTriangle, Check, Copy, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useApiKeyManagementModalStore } from "@/store/modals/apiKeyManagement";
import { envVars } from "@/utilities/enviromentVars";
import { useApiKey, useCreateApiKey, useRevokeApiKey } from "../hooks/use-api-key";
import type { ApiKeyInfo } from "../types/api-key";

export function ApiKeyManagementModal() {
  const { address } = useAuth();
  const { isModalOpen, closeModal } = useApiKeyManagementModalStore();
  const { data, isLoading: isLoadingKey, isError: isKeyError, refetch } = useApiKey(address);
  const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  const { mutate: createKey, isPending: isCreating } = useCreateApiKey({
    onSuccess: (result) => {
      setJustCreatedKey(result.key);
      setKeyName("");
      setShowRegenerateConfirm(false);
    },
    onError: () => {
      toast.error("Failed to generate API key");
    },
  });

  const { mutate: revokeKey, isPending: isRevoking } = useRevokeApiKey({
    onSuccess: () => {
      setJustCreatedKey(null);
      setShowRevokeConfirm(false);
      toast.success("API key revoked");
    },
    onError: () => {
      toast.error("Failed to revoke API key");
    },
  });

  useEffect(() => {
    if (!isModalOpen) {
      setJustCreatedKey(null);
      setKeyName("");
      setShowRevokeConfirm(false);
      setShowRegenerateConfirm(false);
    }
  }, [isModalOpen]);

  const existingKey = data?.apiKey;

  return (
    <Dialog
      open={isModalOpen}
      onOpenChange={(open) => {
        if (!open && justCreatedKey) return;
        if (!open) closeModal();
      }}
    >
      <DialogContent
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl dark:bg-zinc-800 bg-white p-6"
        onEscapeKeyDown={(e) => {
          if (justCreatedKey) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (justCreatedKey) e.preventDefault();
        }}
      >
        {showRegenerateConfirm ? (
          <DestructiveConfirmation
            title="Regenerate API Key?"
            description="This will immediately invalidate your current API key and generate a new one. Any agents or scripts using the current key will lose access."
            confirmLabel="Regenerate"
            onCancel={() => setShowRegenerateConfirm(false)}
            onConfirm={() => createKey(existingKey?.name || undefined)}
            isPending={isCreating}
          />
        ) : showRevokeConfirm ? (
          <DestructiveConfirmation
            title="Revoke API Key?"
            description="This will immediately invalidate your API key. Any agents or scripts using this key will lose access. This action cannot be undone."
            confirmLabel="Revoke"
            onCancel={() => setShowRevokeConfirm(false)}
            onConfirm={() => revokeKey()}
            isPending={isRevoking}
          />
        ) : justCreatedKey ? (
          <KeyCreatedState
            apiKey={justCreatedKey}
            onCopy={() => copyToClipboard(justCreatedKey, "API key copied to clipboard")}
            onDone={closeModal}
          />
        ) : isLoadingKey ? (
          <LoadingState />
        ) : isKeyError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : existingKey ? (
          <ActiveKeyState
            keyInfo={existingKey}
            onRegenerate={() => setShowRegenerateConfirm(true)}
            onRevoke={() => setShowRevokeConfirm(true)}
            isRegenerating={isCreating}
          />
        ) : (
          <NoKeyState
            keyName={keyName}
            onKeyNameChange={setKeyName}
            onGenerate={() => createKey(keyName || undefined)}
            isGenerating={isCreating}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LoadingState() {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-muted animate-pulse" />
          API Key
        </DialogTitle>
        <DialogDescription>Loading your API key information...</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <DialogFooter>
        <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
        <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
      </DialogFooter>
    </>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          API Key
        </DialogTitle>
        <DialogDescription>Failed to load API key data. Please try again.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button onClick={onRetry} autoFocus>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </DialogFooter>
    </>
  );
}

function NoKeyState({
  keyName,
  onKeyNameChange,
  onGenerate,
  isGenerating,
}: {
  keyName: string;
  onKeyNameChange: (name: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          API Key
        </DialogTitle>
        <DialogDescription>
          You don&apos;t have an API key yet. API keys allow AI agents and scripts to authenticate
          as your account.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div>
          <label htmlFor="key-name" className="text-sm font-medium text-foreground">
            Key name <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="key-name"
            value={keyName}
            onChange={(e) => onKeyNameChange(e.target.value)}
            placeholder="My AI Agent"
            className="mt-1"
            maxLength={100}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onGenerate} disabled={isGenerating} autoFocus>
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate API Key
        </Button>
      </DialogFooter>
    </>
  );
}

function KeyCreatedState({
  apiKey,
  onCopy,
  onDone,
}: {
  apiKey: string;
  onCopy: () => void;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    copyRef.current?.focus();
  }, []);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
          API Key Created
        </DialogTitle>
        <DialogDescription className="flex items-start gap-2 pt-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>Copy your API key now. You won&apos;t be able to see it again.</span>
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="rounded-md border border-border bg-muted p-3">
          <code className="font-mono text-sm break-all text-foreground">{apiKey}</code>
        </div>
        <div className="text-xs text-muted-foreground">
          Use this key in the <code className="font-mono text-foreground">x-api-key</code> header:
          <pre className="font-mono mt-1 rounded bg-muted p-2 text-xs overflow-x-auto">
            {`curl -H "x-api-key: YOUR_API_KEY" \\
  ${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/user/me`}
          </pre>
        </div>
      </div>
      <DialogFooter>
        <Button ref={copyRef} variant="outline" onClick={handleCopy}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copied" : "Copy to Clipboard"}
        </Button>
        <Button onClick={onDone}>I&apos;ve Saved It</Button>
      </DialogFooter>
    </>
  );
}

function ActiveKeyState({
  keyInfo,
  onRegenerate,
  onRevoke,
  isRegenerating,
}: {
  keyInfo: Pick<ApiKeyInfo, "keyHint" | "name" | "createdAt" | "lastUsedAt">;
  onRegenerate: () => void;
  onRevoke: () => void;
  isRegenerating: boolean;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          API Key
        </DialogTitle>
        <DialogDescription>
          Manage your API key for programmatic access to your account.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <InfoRow label="Name" value={keyInfo.name} />
        <InfoRow label="Key" value={`karma_${keyInfo.keyHint}`} mono />
        <InfoRow
          label="Created"
          value={new Date(keyInfo.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        />
        <InfoRow
          label="Last used"
          value={
            keyInfo.lastUsedAt
              ? new Date(keyInfo.lastUsedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Never"
          }
        />
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Status</span>
          <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Active
          </span>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onRegenerate} disabled={isRegenerating}>
          {isRegenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Regenerate Key
        </Button>
        <Button variant="destructive" onClick={onRevoke}>
          Revoke Key
        </Button>
      </DialogFooter>
    </>
  );
}

function DestructiveConfirmation({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  isPending,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="pt-2">{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isPending} autoFocus>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-foreground${mono ? " font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
