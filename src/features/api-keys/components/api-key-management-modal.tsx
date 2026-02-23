"use client";

import { AlertTriangle, Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useNavbarPermissions } from "@/src/components/navbar/navbar-permissions-context";
import { useApiKeyManagementModalStore } from "@/store/modals/apiKeyManagement";
import { useApiKey, useCreateApiKey, useRevokeApiKey } from "../hooks/use-api-key";

export function ApiKeyManagementModal() {
  const { address } = useNavbarPermissions();
  const { isModalOpen, closeModal } = useApiKeyManagementModalStore();
  const { data, isLoading: isLoadingKey } = useApiKey(address);
  const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();

  const { mutate: createKey, isPending: isCreating } = useCreateApiKey({
    onSuccess: (result) => {
      setJustCreatedKey(result.key);
      setKeyName("");
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
    }
  }, [isModalOpen]);

  const existingKey = data?.apiKey;

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="w-full max-w-lg rounded-2xl dark:bg-zinc-800 bg-white p-6">
        {showRevokeConfirm ? (
          <RevokeConfirmation
            onCancel={() => setShowRevokeConfirm(false)}
            onConfirm={() => revokeKey()}
            isRevoking={isRevoking}
          />
        ) : justCreatedKey ? (
          <KeyCreatedState
            apiKey={justCreatedKey}
            onCopy={() => copyToClipboard(justCreatedKey, "API key copied to clipboard")}
            onDone={closeModal}
          />
        ) : isLoadingKey ? (
          <LoadingState />
        ) : existingKey ? (
          <ActiveKeyState
            keyInfo={existingKey}
            onRegenerate={() => createKey(keyName || undefined)}
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
        <DialogTitle>API Key</DialogTitle>
      </DialogHeader>
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
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
            Key name
          </label>
          <input
            id="key-name"
            type="text"
            value={keyName}
            onChange={(e) => onKeyNameChange(e.target.value)}
            placeholder="My AI Agent"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            maxLength={100}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onGenerate} disabled={isGenerating}>
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

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Check className="h-5 w-5 text-green-500" />
          API Key Created
        </DialogTitle>
        <DialogDescription className="flex items-start gap-2 pt-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <span>Copy your API key now. You won&apos;t be able to see it again.</span>
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="rounded-md border border-border bg-muted p-3">
          <code className="text-sm break-all text-foreground">{apiKey}</code>
        </div>
        <div className="text-xs text-muted-foreground">
          Use this key in the <code className="text-foreground">x-api-key</code> header:
          <pre className="mt-1 rounded bg-muted p-2 text-xs overflow-x-auto">
            {`curl -H "x-api-key: ${apiKey.slice(0, 20)}..." \\
  https://api.gap.karmahq.xyz/v2/user/me`}
          </pre>
        </div>
      </div>
      <DialogFooter className="flex gap-2 sm:gap-2">
        <Button variant="outline" onClick={handleCopy}>
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
  keyInfo: {
    keyHint: string;
    name: string;
    createdAt: string;
    lastUsedAt: string | null;
  };
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
      </DialogHeader>
      <div className="space-y-3 py-2">
        <InfoRow label="Name" value={keyInfo.name} />
        <InfoRow label="Key" value={`karma_${keyInfo.keyHint}`} />
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
      </div>
      <DialogFooter className="flex gap-2 sm:gap-2">
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

function RevokeConfirmation({
  onCancel,
  onConfirm,
  isRevoking,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  isRevoking: boolean;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Revoke API Key?</DialogTitle>
        <DialogDescription className="pt-2">
          This will immediately invalidate your API key. Any agents or scripts using this key will
          lose access. This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex gap-2 sm:gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isRevoking}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isRevoking}>
          {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Revoke
        </Button>
      </DialogFooter>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
