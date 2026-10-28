import { useCallback, useState } from "react";

const STORAGE_PREFIX = "application-comment-draft:";

export function commentDraftStorageKey(draftKey: string): string {
  return `${STORAGE_PREFIX}${draftKey}`;
}

function readDraft(draftKey: string | undefined): string {
  if (!draftKey || typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(commentDraftStorageKey(draftKey)) ?? "";
  } catch {
    // SUPPRESSED: sessionStorage is unavailable in private windows and sandboxed
    // frames; the draft then simply lives in component state for this mount.
    return "";
  }
}

function writeDraft(draftKey: string | undefined, value: string): void {
  if (!draftKey || typeof window === "undefined") return;
  try {
    const storageKey = commentDraftStorageKey(draftKey);
    if (value.trim()) {
      window.sessionStorage.setItem(storageKey, value);
    } else {
      window.sessionStorage.removeItem(storageKey);
    }
  } catch {
    // SUPPRESSED: see readDraft — a storage failure only loses tab-switch
    // persistence, never the text the user is currently typing.
  }
}

export interface CommentDraft {
  value: string;
  setValue: (value: string) => void;
  clear: () => void;
}

/**
 * Comment text that survives the input unmounting (tab switches on the
 * application page) by mirroring to sessionStorage under `draftKey`.
 * The draft is dropped only through `clear()`, i.e. once the comment is sent.
 */
export function useCommentDraft(draftKey: string | undefined): CommentDraft {
  const [value, setValueState] = useState(() => readDraft(draftKey));

  const setValue = useCallback(
    (next: string) => {
      setValueState(next);
      writeDraft(draftKey, next);
    },
    [draftKey]
  );

  const clear = useCallback(() => {
    setValueState("");
    writeDraft(draftKey, "");
  }, [draftKey]);

  return { value, setValue, clear };
}
