"use client";

import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
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
        className="flex animate-pulse flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        aria-busy="true"
      >
        <div className="h-5 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/40 dark:bg-rose-950/40">
        <p className="text-sm text-rose-900 dark:text-rose-100">Could not load your API keys.</p>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const keys = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Scanner API keys
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Use these keys to call the Scanner REST API or to install the Karma Scanner MCP server
            in Claude Desktop, ChatGPT, or Cursor. Each key carries scanner:read and scanner:write
            scopes.
          </p>
        </div>
        <Button type="button" onClick={() => dispatch({ type: "open_create_modal" })}>
          Generate key
        </Button>
      </div>

      {keys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          You have not generated any API keys yet. Generate one to call the scanner via REST or MCP.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-zinc-500" aria-hidden />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {key.name}
                  </span>
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    karma_scanner_...{key.prefix}
                  </span>
                </div>
              </div>
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
            </li>
          ))}
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
                  This is the only time you will see the full key. Copy it now and store it
                  somewhere safe.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-md bg-zinc-100 p-3 font-mono text-sm dark:bg-zinc-800">
                  {ui.justCreatedKey}
                </code>
                <Button type="button" variant="outline" onClick={handleCopy} aria-label="Copy key">
                  {ui.copied ? (
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden />
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
                    {isIssuing ? "Generating..." : "Generate"}
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
              Any application or MCP client using <strong>{ui.revokeTarget?.name}</strong> will
              stop working immediately. This cannot be undone.
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
              {isRevoking ? "Revoking..." : "Revoke key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
