import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commentDraftStorageKey, useCommentDraft } from "../use-comment-draft";

const KEY = "APP-TEST-1";

describe("useCommentDraft", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("starts empty and mirrors typed text to sessionStorage", () => {
    const { result } = renderHook(() => useCommentDraft(KEY));
    expect(result.current.value).toBe("");

    act(() => result.current.setValue("hello"));

    expect(result.current.value).toBe("hello");
    expect(window.sessionStorage.getItem(commentDraftStorageKey(KEY))).toBe("hello");
  });

  it("restores the draft on a fresh mount with the same key", () => {
    const first = renderHook(() => useCommentDraft(KEY));
    act(() => first.result.current.setValue("draft text"));
    first.unmount();

    const second = renderHook(() => useCommentDraft(KEY));
    expect(second.result.current.value).toBe("draft text");
  });

  it("keeps drafts of different applications apart", () => {
    const a = renderHook(() => useCommentDraft("APP-A"));
    act(() => a.result.current.setValue("for A"));

    const b = renderHook(() => useCommentDraft("APP-B"));
    expect(b.result.current.value).toBe("");
  });

  it("drops the stored draft on clear and on whitespace-only text", () => {
    const { result } = renderHook(() => useCommentDraft(KEY));
    act(() => result.current.setValue("something"));
    act(() => result.current.clear());

    expect(result.current.value).toBe("");
    expect(window.sessionStorage.getItem(commentDraftStorageKey(KEY))).toBeNull();

    act(() => result.current.setValue("   "));
    expect(window.sessionStorage.getItem(commentDraftStorageKey(KEY))).toBeNull();
  });

  it("works as plain state when there is no key", () => {
    const { result } = renderHook(() => useCommentDraft(undefined));
    act(() => result.current.setValue("ephemeral"));
    expect(result.current.value).toBe("ephemeral");
    expect(window.sessionStorage.length).toBe(0);
  });

  it("survives a storage failure without losing the typed text", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const { result } = renderHook(() => useCommentDraft(KEY));
    act(() => result.current.setValue("still here"));
    expect(result.current.value).toBe("still here");
  });
});
