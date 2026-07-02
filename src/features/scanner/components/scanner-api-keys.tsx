"use client";

import { Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useReducer } from "react";
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
import { Label } from "@/components/ui/label";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
  useIssueScannerKey,
  useMyScannerKeys,
  useRevokeScannerKey,
} from "../hooks/use-my-scanner-keys";
import type { ScannerApiKey } from "../types";
import { ErrorState } from "./error-state";

// Five related ScannerApiKeys ui states (showCreateModal, revokeTarget,
// justCreatedKey, newKeyName, copied) were five useState calls — React
// Doctor flagged it as "many related useState" because a single logical
// update (close the create modal) was triggering several re-renders. A
// reducer with a small action set collapses the render storm and makes
// the modal lifecycle explicit.
interface ScannerKeysUiState {
  readonly showCreateModal: boolean;
  readonly revokeTarget: ScannerApiKey | null;
  readonly justCreatedKey: string | null;
  readonly newKeyName: string;
  readonly copied: boolean;
}

type ScannerKeysUiAction =
  | { readonly type: "open_create_modal" }
  | { readonly type: "close_create_modal" }
  | { readonly type: "set_new_key_name"; readonly name: string }
  | { readonly type: "key_issued"; readonly key: string }
  | { readonly type: "open_revoke_confirm"; readonly target: ScannerApiKey }
  | { readonly type: "close_revoke_confirm" }
  | { readonly type: "mark_copied" }
  | { readonly type: "clear_copied" };

const SCANNER_KEYS_UI_INITIAL: ScannerKeysUiState = {
  showCreateModal: false,
  revokeTarget: null,
  justCreatedKey: null,
  newKeyName: "",
  copied: false,
};

function scannerKeysUiReducer(
  state: ScannerKeysUiState,
  action: ScannerKeysUiAction
): ScannerKeysUiState {
  switch (action.type) {
    case "open_create_modal":
      return { ...state, showCreateModal: true };
    case "close_create_modal":
      return {
        ...state,
        showCreateModal: false,
        justCreatedKey: null,
        newKeyName: "",
        copied: false,
      };
    case "set_new_key_name":
      return { ...state, newKeyName: action.name };
    case "key_issued":
      return { ...state, justCreatedKey: action.key, newKeyName: "" };
    case "open_revoke_confirm":
      return { ...state, revokeTarget: action.target };
    case "close_revoke_confirm":
      return { ...state, revokeTarget: null };
    case "mark_copied":
      return { ...state, copied: true };
    case "clear_copied":
      return { ...state, copied: false };
  }
}

export function ScannerApiKeys() {
  const { data, isLoading, isError, refetch } = useMyScannerKeys();
  const [ui, dispatch] = useReducer(scannerKeysUiReducer, SCANNER_KEYS_UI_INITIAL);
  const [, copyToClipboard] = useCopyToClipboard();

  const { mutate: issue, isPending: isIssuing } = useIssueScannerKey({
    onSuccess: (issued) => {
      dispatch({ type: "key_issued", key: issued.key });
      toast.success("Key generated. Save it now, you will not see it again.");
    },
    onError: () => {
      toast.error("Could not generate the key. Please try again.");
    },
  });

  const { mutate: revoke, isPending: isRevoking } = useRevokeScannerKey({
    onSuccess: () => {
      dispatch({ type: "close_revoke_confirm" });
      toast.success("Key revoked.");
    },
    onError: () => {
      toast.error("Could not revoke the key. Please try again.");
    },
  });

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ui.newKeyName.trim()) {
      return;
    }
    issue({ name: ui.newKeyName.trim() });
  }

  async function handleCopy() {
    if (!ui.justCreatedKey) {
      return;
    }
    // copyToClipboard resolves to false when the browser blocks clipboard
    // access (insecure context, permission denied). Mark copied only on
    // success so the user doesn't see a false "Copied" confirmation.
    const ok = await copyToClipboard(ui.justCreatedKey);
    if (!ok) {
      return;
    }
    dispatch({ type: "mark_copied" });
    setTimeout(() => dispatch({ type: "clear_copied" }), 2000);
  }

  function closeCreateModal() {
    if (isIssuing) {
      return;
    }
    dispatch({ type: "close_create_modal" });
  }

  if (isLoading) {
    return (
      <div
        className="flex animate-pulse flex-col gap-3 rounded-2xl border border-border bg-card p-6"
        aria-busy="true"
      >
        <div className="h-5 w-1/3 rounded bg-secondary" />
        <div className="h-5 w-2/3 rounded bg-secondary" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load your API keys"
        message="Something went wrong fetching your scanner keys. Please try again."
        onRetry={() => refetch()}
        icon={KeyRound}
      />
    );
  }

  const keys = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-tight text-foreground">Scanner API keys</h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Call the Scanner REST API or install the Karma Scanner MCP server in Claude Desktop,
            ChatGPT, or Cursor. Each key carries{" "}
            <code className="font-mono text-xs">scanner:read</code> and{" "}
            <code className="font-mono text-xs">scanner:write</code> scopes.
          </p>
        </div>
        <Button type="button" onClick={() => dispatch({ type: "open_create_modal" })}>
          <Plus className="h-4 w-4" aria-hidden />
          Generate key
        </Button>
      </div>

      {keys.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/40 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand-emphasis">
            <KeyRound className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">
            No API keys yet. Generate one to call the scanner via REST or MCP.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {keys.map((key) => {
            const revoked = key.revokedAt !== null;
            return (
              <li
                key={key.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 ${
                  revoked ? "opacity-60" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-brand-emphasis">
                    <KeyRound className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {key.name}
                      </span>
                      {revoked ? (
                        <span className="rounded-full bg-secondary px-2 py-px text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Revoked
                        </span>
                      ) : null}
                    </div>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      karma_scanner_…{key.prefix}
                    </span>
                  </div>
                </div>
                {revoked ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => dispatch({ type: "open_revoke_confirm", target: key })}
                    aria-label={`Revoke ${key.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    <span className="sr-only sm:not-sr-only sm:ml-1">Revoke</span>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={ui.showCreateModal}
        onOpenChange={(open) => (!open ? closeCreateModal() : undefined)}
      >
        <DialogContent className="max-w-md">
          {ui.justCreatedKey ? (
            <>
              <DialogHeader>
                <DialogTitle>Save your new API key</DialogTitle>
                <DialogDescription>
                  This is the only time you'll see the full key. Copy it now and store it somewhere
                  safe.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-md bg-secondary p-3 font-mono text-sm text-foreground">
                  {ui.justCreatedKey}
                </code>
                <Button type="button" variant="outline" onClick={handleCopy} aria-label="Copy key">
                  {ui.copied ? (
                    <Check className="h-4 w-4 text-brand-emphasis" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </div>
              <DialogFooter>
                <Button type="button" onClick={closeCreateModal}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Generate scanner API key</DialogTitle>
                <DialogDescription>
                  Give the key a name so you can identify it later (for example, the project or tool
                  that will use it).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="key-name">Key name</Label>
                  <Input
                    id="key-name"
                    required
                    value={ui.newKeyName}
                    onChange={(event) =>
                      dispatch({ type: "set_new_key_name", name: event.target.value })
                    }
                    disabled={isIssuing}
                    placeholder="My donor advisor tool"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeCreateModal}
                    disabled={isIssuing}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isIssuing || !ui.newKeyName.trim()}>
                    {isIssuing ? "Generating…" : "Generate"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={ui.revokeTarget !== null}
        onOpenChange={(open) =>
          !open && !isRevoking ? dispatch({ type: "close_revoke_confirm" }) : undefined
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke this API key?</DialogTitle>
            <DialogDescription>
              Any application or MCP client using <strong>{ui.revokeTarget?.name}</strong> will stop
              working immediately. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => dispatch({ type: "close_revoke_confirm" })}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isRevoking || !ui.revokeTarget}
              onClick={() => ui.revokeTarget && revoke(ui.revokeTarget.id)}
            >
              {isRevoking ? "Revoking…" : "Revoke key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
